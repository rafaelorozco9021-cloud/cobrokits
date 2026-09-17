'use client';

import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/auth';
import { ThWithTooltipLight } from '@/components/ThWithTooltip';

export default function Page() {
  const [cobros, setCobros] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [warehouse, setWarehouse] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const detail = useMemo(() => cobros.find((c) => c.id === selected) || null, [cobros, selected]);

  const warehouseMap = useMemo(() => {
    const m = new Map();
    for (const w of warehouse) m.set(w.product_id, Number(w.total_quantity || 0));
    return m;
  }, [warehouse]);

  const deliveredMap = useMemo(() => {
    const m = new Map();
    for (const d of delivered) m.set(d.product_id, Number(d.quantity || 0));
    return m;
  }, [delivered]);

  async function loadCobros() {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/cobros', { credentials: 'include', headers });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCobros(list);
      if (list.length > 0 && !selected) setSelected(list[0].id);
    } catch {}
  }

  async function loadProductsAndStock() {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [prodRes, stockRes] = await Promise.all([
        fetch('/api/products', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
        fetch('/api/stock', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
      ]);
      const prods = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
      const stock = Array.isArray(stockRes) ? stockRes : stockRes?.data || [];
      // si stock viene como stub, ignorar
      const wh = Array.isArray(stock) && !stock.stub ? stock : [];
      setProducts(prods);
      setWarehouse(wh);
    } catch {}
  }

  async function loadDelivered(sellerId) {
    if (!sellerId) { setDelivered([]); return; }
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      // nuevo endpoint summary con asignado/vendido/resto
      let res = await fetch(`/api/inventory/summary?sellerId=${sellerId}`, { credentials: 'include', headers });
      let data = await res.json();
      if (Array.isArray(data) && data.length >= 0 && !data[0]?.success) {
        // si es array válido (incluso vacío) lo usamos
        if (Array.isArray(data)) { setDelivered(data.filter((r) => !r.stub && (r.asignado || r.vendido || r.resto))); return; }
      }
      // fallback a /api/inventory si summary falla
      if (!Array.isArray(data) || data.success === false) {
        res = await fetch(`/api/inventory?sellerId=${sellerId}`, { credentials: 'include', headers });
        data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // mapear formato viejo a nuevo: asignado = quantity, vendido 0, resto = quantity
        const mapped = list.filter((r) => !r.stub).map((r) => ({ product_id: r.product_id, asignado: Number(r.quantity||0), vendido: 0, resto: Number(r.quantity||0), cost_price: r.cost_price }));
        setDelivered(mapped);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setDelivered(list.filter((r) => !r.stub));
    } catch { setDelivered([]); }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCobros(), loadProductsAndStock()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (detail?.seller_id) loadDelivered(detail.seller_id);
  }, [detail?.seller_id]);

  function setQty(productId, val) {
    const n = Math.max(0, parseInt(val || 0, 10));
    setQuantities((prev) => ({ ...prev, [productId]: n }));
  }

  async function handleAsignar() {
    if (!detail?.seller_id) { setErr('Selecciona un cobro con vendedor'); return; }
    const items = Object.entries(quantities)
      .filter(([, q]) => Number(q) > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) }));
    if (items.length === 0) { setErr('Ingresa cantidad para al menos un producto'); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/inventory', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ seller_id: detail.seller_id, cobro_id: detail.id, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg(`Asignado ${data.delivered || items.length} productos a ${detail.seller_name || 'vendedor'} — ${totalCant} unid.`);
      setQuantities({});
      await loadDelivered(detail.seller_id);
      await loadProductsAndStock();
    } catch (e) {
      setErr(e.message);
    } finally { setSaving(false); }
  }

  async function handleCerrar() {
    if (!detail?.seller_id) { setErr('Selecciona un cobro'); return; }
    if (delivered.length === 0) { setErr('No hay stock para cerrar'); return; }
    if (!confirm(`¿Cerrar venta de hoy para ${detail.seller_name}? Sobrante volverá a bodega.`)) return;
    setSaving(true); setErr(''); setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/inventory/close', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ seller_id: detail.seller_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg(`Cierre OK: llevó ${data.llevado} unid., vendió ${data.vendido}, devolvió ${data.devuelto} a bodega`);
      await loadDelivered(detail.seller_id);
      await loadProductsAndStock();
    } catch (e) {
      setErr(e.message);
    } finally { setSaving(false); }
  }

  const totalCant = Object.values(quantities).reduce((a, v) => a + Number(v || 0), 0);
  const totalCosto = Object.entries(quantities).reduce((acc, [pid, qty]) => {
    const p = products.find((x) => x.id === pid);
    return acc + Number(p?.cost_price || p?.cost || 0) * Number(qty || 0);
  }, 0);
  const totalPvp = Object.entries(quantities).reduce((acc, [pid, qty]) => {
    const p = products.find((x) => x.id === pid);
    return acc + Number(p?.price || 0) * Number(qty || 0);
  }, 0);

  const todayLabel = `Hoy (${new Date().toISOString().split('T')[0]})`;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Entregar Inventario</h1>
        {(msg || err) && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold ${err ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
            {err || msg}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Izquierda: entrega */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Entregar inventario diario</h3>
          {loading ? (
            <p className="text-xs text-slate-400">Cargando cobros y productos...</p>
          ) : (
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200 mb-3">
              {cobros.length === 0 && <option>No hay cobros</option>}
              {cobros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.grupo} ({c.seller_name || c.seller_id?.slice(0, 6)})
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-[1fr_60px_80px_80px_70px] gap-1 text-[11px] font-bold text-[#2563eb] bg-blue-50 px-2 py-1.5 rounded mb-1">
            <span title="Nombre del producto">PRODUCTO</span><span className="text-center" title="Stock disponible en bodega. Fórmula: total_quantity en inventario general">STOCK</span><span className="text-center" title="Costo unitario. Campo: cost_price">COSTO</span><span className="text-center" title="Precio de venta. Campo: price">PVP</span><span className="text-center" title="Cantidad a asignar al vendedor (no puede exceder STOCK). Al asignar se descuenta de bodega">CANT.</span>
          </div>

          <div className="max-h-[480px] overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {products.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No hay productos</p>
            ) : (
              products.map((p) => {
                const stock = warehouseMap.has(p.id) ? warehouseMap.get(p.id) : Number(p.stock ?? 0);
                const costo = Number(p.cost_price || p.cost || 0);
                const pvp = Number(p.price || 0);
                const cant = quantities[p.id] || '';
                return (
                  <div key={p.id} className="grid grid-cols-[1fr_60px_80px_80px_70px] gap-1 items-center px-2 py-1.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.sku || p.id.slice(0,6)} · {p.category || 'general'}</p>
                    </div>
                    <span className={`text-xs text-center font-bold ${stock <= 0 ? 'text-red-600' : stock <= 3 ? 'text-amber-600' : 'text-slate-700'}`}>{stock}</span>
                    <span className="text-xs text-center text-slate-600">${costo.toLocaleString('es-CO')}</span>
                    <span className="text-xs text-center font-bold text-slate-900">${pvp.toLocaleString('es-CO')}</span>
                    <input
                      type="number"
                      min={0}
                      max={stock}
                      value={cant}
                      onChange={(e) => setQty(p.id, e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-center text-slate-900 bg-white focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                    />
                  </div>
                );
              })
            )}
          </div>

          {totalCant > 0 && (
            <div className="mt-2 flex gap-3 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span><b>{totalCant}</b> unidades</span>
              <span>Costo <b>${totalCosto.toLocaleString('es-CO')}</b></span>
              <span>PVP <b>${totalPvp.toLocaleString('es-CO')}</b></span>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-2">Productos se descuentan del inventario general al asignar.</p>
          <button onClick={handleAsignar} disabled={saving || totalCant === 0} className="w-full mt-3 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700">
            {saving ? 'Asignando...' : `Asignar${totalCant ? ` (${totalCant} unid.)` : ''}`}
          </button>
        </div>

        {/* Derecha: stock entregado */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Stock entregado</h3>
            <div className="flex gap-2 items-center">
              <span className="border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold bg-amber-50 text-slate-900">{todayLabel}</span>
            </div>
          </div>

          {detail ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Cobro <span className="font-bold">{detail.name}</span> con <span className="font-bold">{detail.seller_name}</span> — {cobros.filter((c) => c.dia === detail.dia).length} cobros este día
              </p>

              {delivered.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                  <p className="text-xs font-bold text-slate-700">Sin stock entregado hoy</p>
                  <p className="text-xs text-slate-500 mt-1">Asigna productos al vendedor desde el panel izquierdo. Lo asignado hoy aparecerá aquí y se descontará con cada venta.</p>
                </div>
              ) : (
                <>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_52px_52px_52px] gap-1 text-[11px] font-bold text-[#2563eb] bg-blue-50 px-2 py-1.5">
                      <span title="Producto entregado">PRODUCTO</span><span className="text-center" title="Cantidad asignada al vendedor hoy. Fórmula: SUM(cantidad asignada)">ASIG.</span><span className="text-center" title="Cantidad vendida hoy. Fórmula: SUM(cantidad vendida por visitas)">VEND.</span><span className="text-center" title="Stock restante. Fórmula: RESTO = ASIG. - VEND.">RESTO</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[320px] overflow-auto">
                      {delivered.map((d) => {
                        const prod = products.find((pp) => pp.id === d.product_id);
                        const asign = Number(d.asignado ?? d.quantity ?? 0);
                        const vend = Number(d.vendido ?? 0);
                        const resto = Number(d.resto ?? d.quantity ?? 0);
                        return (
                          <div key={d.product_id} className="grid grid-cols-[1fr_52px_52px_52px] gap-1 items-center px-2 py-1.5 hover:bg-slate-50">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{prod?.name || d.product_id.slice(0,8)}</p>
                              <p className="text-[10px] text-slate-500 truncate">{prod?.sku || ''} · {prod?.category || ''}</p>
                            </div>
                            <span className="text-xs text-center font-bold text-slate-800 bg-amber-50 rounded px-1">{asign}</span>
                            <span className="text-xs text-center font-bold text-emerald-700 bg-emerald-50 rounded px-1">{vend}</span>
                            <span className={`text-xs text-center font-black rounded px-1 ${resto===0?'bg-slate-100 text-slate-500':resto<=2?'bg-red-50 text-red-600':'bg-blue-50 text-[#2563eb]'}`}>{resto}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-blue-50 px-2 py-1.5 flex justify-between text-xs font-bold text-[#2563eb] border-t border-blue-100">
                      <span>Asig: {delivered.reduce((a, d) => a + Number(d.asignado ?? d.quantity ?? 0), 0)} | Vend: {delivered.reduce((a, d) => a + Number(d.vendido ?? 0), 0)} | Resto: {delivered.reduce((a, d) => a + Number(d.resto ?? d.quantity ?? 0), 0)}</span>
                      <span>{delivered.length} prod.</span>
                    </div>
                  </div>
                  <button onClick={handleCerrar} disabled={saving} className="w-full mt-2 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black disabled:opacity-50">
                    {saving ? 'Cerrando...' : 'Cerrar venta de hoy (devolver sobrante)'}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">Al cerrar, el sobrante vuelve a bodega. Queda registro de lo llevado y lo vendido.</p>
                </>
              )}

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
                <p className="font-bold">Clientes asignados a este cobro</p>
                <p className="text-slate-500">Ver en Config de Cobros. Ventas registradas para este cobro se reflejan en Operación diaria.</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">Selecciona un cobro para ver el stock entregado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
