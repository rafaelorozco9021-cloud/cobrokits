'use client';

import { useEffect, useState } from 'react';
import { buildAuthHeaders } from '@/lib/auth';

function money(n) {
  const v = Number(n || 0);
  return `$ ${v.toLocaleString('es-CO')}`;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h3 className="font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Todos los productos');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [fProduct, setFProduct] = useState({ name: '', description: '', cost_price: '', price: '', category: 'embutidos', stock: '' });
  // Ingreso de stock: producto objetivo + cantidad
  const [stockTarget, setStockTarget] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const headers = buildAuthHeaders();
      let prodRaw = await fetch('/api/products', { credentials: 'include', headers });
      let prodText = await prodRaw.text();
      console.log('[inventario] /api/products status', prodRaw.status, prodText.slice(0, 200));
      let prodRes;
      try {
        prodRes = JSON.parse(prodText);
      } catch {
        prodRes = { error: prodText };
      }
      if (!prodRaw.ok) {
        console.warn('[inventario] proxy failed, trying direct', prodRaw.status);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const directUrl = `${API_URL.replace(/\/$/, '')}/api/products`;
        const directRes = await fetch(directUrl, { credentials: 'include', headers });
        const directText = await directRes.text();
        console.log('[inventario] direct status', directRes.status, directText.slice(0, 200));
        try {
          prodRes = JSON.parse(directText);
        } catch {
          prodRes = { error: directText };
        }
        if (!directRes.ok) {
          throw new Error(`products ${directRes.status}: ${prodRes.message || prodRes.error || directText.slice(0, 100)} (proxy ${prodRaw.status})`);
        }
        prodRaw = directRes;
        prodText = directText;
      }
      const wareRes = await fetch('/api/general-stock', { credentials: 'include', headers }).then((r) => r.json().catch(() => []));
      const invRes = await fetch('/api/inventory', { credentials: 'include', headers }).then((r) => r.json().catch(() => []));

      console.log('[inventario] ware', Array.isArray(wareRes) ? wareRes.length : wareRes);
      console.log('[inventario] inv', Array.isArray(invRes) ? invRes.length : invRes);

      const prodList = Array.isArray(prodRes)
        ? prodRes
        : Array.isArray(prodRes?.data)
          ? prodRes.data
          : Array.isArray(prodRes?.products)
            ? prodRes.products
            : [];
      if (prodList.length === 0 && prodRes && !Array.isArray(prodRes)) {
        console.warn('[inventario] prodRes no array', prodRes);
        throw new Error(prodRes.message || prodRes.error || 'No hay productos (respuesta no array)');
      }
      // Filtrar demo + activos - si hay DEMO, mostrar solo DEMO, sino todos con price
      const demo = prodList.filter((p) => p.sku?.startsWith('DEMO-'));
      const toShow = demo.length ? demo : prodList.filter((p) => p.price);
      console.log('[inventario] toShow', toShow.length, 'de', prodList.length);
      setProducts(toShow.length ? toShow : prodList);

      // warehouse_stock: total_quantity por product_id
      const wMap = {};
      if (Array.isArray(wareRes)) {
        wareRes.forEach((w) => {
          wMap[w.product_id] = Number(w.total_quantity ?? w.quantity ?? 0);
        });
      }
      // seller_inventory: si hay, preferir warehouse pero mostrar también
      if (Array.isArray(invRes) && Object.keys(wMap).length === 0) {
        invRes.forEach((si) => {
          // si no hay warehouse, usar seller_inventory quantity como stock general (sumado)
          wMap[si.product_id] = (wMap[si.product_id] || 0) + Number(si.quantity || 0);
        });
      }
      setStockMap(wMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddStock(e) {
    e.preventDefault();
    if (!stockTarget) return;
    const qty = Number(stockQty || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Ingresa una cantidad mayor a 0.');
      return;
    }
    setStockSaving(true);
    setError('');
    setMsg('');
    try {
      const headers = buildAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/general-stock/add', { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ product_id: stockTarget.id, quantity: qty }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg(`Stock agregado: +${qty} a "${stockTarget.name}" (nuevo stock: ${data.stock})`);
      setStockTarget(null);
      setStockQty('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setStockSaving(false);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const headers = buildAuthHeaders({ 'Content-Type': 'application/json' });
      const payload = {
        name: fProduct.name.trim(),
        description: fProduct.description.trim(),
        cost_price: Number(fProduct.cost_price || 0),
        price: Number(fProduct.price || 0),
        category: fProduct.category,
        stock: Number(fProduct.stock || 0),
      };
      const res = await fetch('/api/products', { method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg(`Producto "${data.name || payload.name}" creado`);
      setFProduct({ name: '', description: '', cost_price: '', price: '', category: 'embutidos', stock: '' });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) => {
    if (filter === 'Todos los productos') return true;
    return p.category === filter || p.name?.toLowerCase().includes(filter.toLowerCase());
  });

  const totalInversion = filtered.reduce((a, p) => {
    const stk = stockMap[p.id] ?? Number(p.stock || 0);
    const cost = Number(p.cost_price || p.cost || 0);
    return a + stk * cost;
  }, 0);
  const totalEstimado = filtered.reduce((a, p) => {
    const stk = stockMap[p.id] ?? Number(p.stock || 0);
    const price = Number(p.price || 0);
    return a + stk * price;
  }, 0);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-slate-900">Inventario General</h1>
          <button onClick={() => { setError(''); setMsg(''); setModal(true); }} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold hover:bg-blue-700 inline-flex items-center gap-2">
            <span className="text-base leading-none">+</span> Agregar producto
          </button>
        </div>
        {msg && <p className="mt-2 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">{msg}</p>}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Inventario General <span className="font-normal text-slate-500">{filtered.length}</span>
            </h3>
            <div className="flex gap-2">
              <button onClick={load} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center" title="Recargar">↻</button>
              <button className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center" title="Exportar">⎙</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">Haz clic en + para agregar stock a un producto. Inversión total: {money(totalInversion)} · Estimado: {money(totalEstimado)}</p>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-[#eff6ff] text-[#2563eb] text-[11px] font-extrabold">
                  <th className="text-left px-3 py-2.5 font-extrabold tracking-wide">PRODUCTO</th>
                  <th className="text-center px-2 py-2.5 font-extrabold tracking-wide w-[70px]">STOCK</th>
                  <th className="text-right px-2 py-2.5 font-extrabold tracking-wide w-[90px]">COSTO</th>
                  <th className="text-right px-2 py-2.5 font-extrabold tracking-wide w-[90px]">PVP</th>
                  <th className="text-right px-2 py-2.5 font-extrabold tracking-wide w-[110px]">INVERSIÓN</th>
                  <th className="text-right px-2 py-2.5 font-extrabold tracking-wide w-[110px]">ESTIMADO</th>
                  <th className="text-center px-2 py-2.5 font-extrabold tracking-wide w-[70px]">AGREGAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-slate-400 py-10">
                      Cargando productos...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-red-500 py-6">
                      {error}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-slate-400 py-6">
                      No hay productos activos.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const stk = stockMap[p.id] ?? Number(p.stock || 0);
                    const cost = Number(p.cost_price || p.cost || 0);
                    const price = Number(p.price || 0);
                    const inv = stk * cost;
                    const est = stk * price;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-900 text-[13px] leading-tight">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.category || 'general'} · {p.sku || p.id.slice(0, 6)}
                          </p>
                        </td>
                        <td className={`text-center font-black text-sm ${stk <= 5 ? 'text-red-600' : stk <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>{stk}</td>
                        <td className="text-right text-[13px] text-slate-700">{money(cost)}</td>
                        <td className="text-right text-[13px] font-bold text-slate-900">{money(price)}</td>
                        <td className="text-right text-[13px] text-slate-600">{money(inv)}</td>
                        <td className="text-right text-[13px] font-bold text-emerald-600">{money(est)}</td>
                        <td className="text-center">
                          <button onClick={() => { setError(''); setMsg(''); setStockQty(''); setStockTarget(p); }} className="w-7 h-7 rounded-full bg-[#2563eb] text-white inline-flex items-center justify-center hover:bg-blue-700 text-sm" title={`Agregar stock a ${p.name}`}>
                            +
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Historial de ingresos</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200 mb-2">
            <option>Todos los productos</option>
            <option>embutidos</option>
            <option>lacteos</option>
            <option>frutos secos</option>
          </select>
          <p className="text-xs font-bold text-slate-600">Mostrando: {filter}</p>
          <p className="text-xs text-slate-700 mt-1">Productos: {filtered.length} · Stock total: {filtered.reduce((a, p) => a + (stockMap[p.id] ?? Number(p.stock || 0)), 0)} uds</p>
          <div className="mt-3 space-y-2 max-h-[320px] overflow-auto">
            {filtered.slice(0, 8).map((p) => (
              <div key={p.id} className="flex justify-between text-xs border-b border-slate-100 py-1.5">
                <span className="truncate pr-2 text-slate-700">{p.name}</span>
                <span className="font-bold text-slate-900">+{stockMap[p.id] ?? p.stock ?? 0}</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-slate-400">No hay ingresos registrados aún.</p>}
          </div>
        </div>
      </div>

      {stockTarget && (
        <Modal title="Agregar stock" onClose={() => setStockTarget(null)}>
          <form onSubmit={handleAddStock} className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="font-bold text-slate-900 text-sm">{stockTarget.name}</p>
              <p className="text-xs text-slate-500">Stock actual: <span className="font-black text-slate-900">{stockMap[stockTarget.id] ?? stockTarget.stock ?? 0}</span> uds</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Cantidad a agregar *</label>
              <input required type="number" min="1" step="1" autoFocus value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="Ej: 50" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setStockTarget(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={stockSaving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{stockSaving ? 'Agregando...' : 'Agregar stock'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal && (
        <Modal title="Agregar Producto" onClose={() => setModal(false)}>
          <form onSubmit={handleAddProduct} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Nombre *</label>
              <input required value={fProduct.name} onChange={(e) => setFProduct({ ...fProduct, name: e.target.value })} placeholder="Ej: Salchichón Premium 1kg" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Descripción</label>
              <input value={fProduct.description} onChange={(e) => setFProduct({ ...fProduct, description: e.target.value })} placeholder="Descripción breve" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Costo *</label>
                <input required type="number" min="0" value={fProduct.cost_price} onChange={(e) => setFProduct({ ...fProduct, cost_price: e.target.value })} placeholder="12000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">PVP *</label>
                <input required type="number" min="0" value={fProduct.price} onChange={(e) => setFProduct({ ...fProduct, price: e.target.value })} placeholder="18000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Categoría</label>
                <select value={fProduct.category} onChange={(e) => setFProduct({ ...fProduct, category: e.target.value })} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 mt-1">
                  <option value="embutidos">embutidos</option>
                  <option value="lacteos">lacteos</option>
                  <option value="frutos secos">frutos secos</option>
                  <option value="general">general</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Stock inicial</label>
                <input type="number" min="0" value={fProduct.stock} onChange={(e) => setFProduct({ ...fProduct, stock: e.target.value })} placeholder="10" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
