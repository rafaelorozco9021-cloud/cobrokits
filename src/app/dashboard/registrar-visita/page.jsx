'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

function money(n) {
  return `$ ${Number(n || 0).toLocaleString('es-CO')}`;
}

export default function Page() {
  const [cobros, setCobros] = useState([]);
  const [selectedCobro, setSelectedCobro] = useState('');
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [productos, setProductos] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cantidades, setCantidades] = useState({});
  const [abono, setAbono] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const hoy = new Date();
  const hoyDia = hoy.getDay(); // 0-6
  const hoyStr = hoy.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // Cargar cobros del día
  useEffect(() => {
    async function loadCobros() {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/cobros?dia=${hoyDia}`, { credentials: 'include', headers });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCobros(list);
        if (list.length > 0) setSelectedCobro(list[0].id);
      } catch {}
    }
    loadCobros();
  }, [hoyDia]);

  // Cargar clientes del cobro seleccionado
  useEffect(() => {
    if (!selectedCobro) return;
    async function loadClientes() {
      const cob = cobros.find((c) => c.id === selectedCobro);
      if (!cob) return;
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Intentar filtrar por cobro_id vía customers, si no, por seller_id
        const res = await fetch('/api/customers', { credentials: 'include', headers });
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];
        let filtered = all.filter((cl) => cl.cobro_id === selectedCobro);
        if (filtered.length === 0) {
          filtered = all.filter((cl) => cl.seller_id === cob.seller_id);
        }
        if (filtered.length === 0) filtered = all.slice(0, 5);
        setClientes(filtered);
        if (filtered.length > 0) setSelectedCliente(filtered[0].id);
        else setSelectedCliente('');
      } catch {}
    }
    loadClientes();
  }, [selectedCobro, cobros]);

  // Cargar productos
  useEffect(() => {
    async function loadProd() {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/products', { credentials: 'include', headers });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const demo = list.filter((p) => p.sku?.startsWith('DEMO-'));
        setProductos(demo.length ? demo : list);
        // stock
        const wRes = await fetch('/api/general-stock', { credentials: 'include', headers }).then((r) => r.json().catch(() => []));
        const map = {};
        if (Array.isArray(wRes)) wRes.forEach((w) => (map[w.product_id] = Number(w.total_quantity || 0)));
        // fallback seller_inventory por cobro seller
        if (Object.keys(map).length === 0) {
          const cob = cobros.find((c) => c.id === selectedCobro);
          if (cob) {
            const invRes = await fetch(`/api/inventory?sellerId=${cob.seller_id}`, { credentials: 'include', headers }).then((r) => r.json().catch(() => []));
            if (Array.isArray(invRes)) invRes.forEach((si) => (map[si.product_id] = Number(si.quantity || 0)));
          }
        }
        setStockMap(map);
      } catch {}
      setLoading(false);
    }
    loadProd();
  }, [selectedCobro, cobros]);

  async function loadVisitasForCobro(cobId) {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const cob = cobros.find((c) => c.id === cobId);
      if (!cob) return;
      const hoyISO = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/visits?sellerId=${cob.seller_id}&cobroId=${cobId}&date=${hoyISO}`, { credentials: 'include', headers });
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];
      // Fallback: si no hay con cobro_id, traer sin filtro cobro pero de hoy
      if (all.length === 0) {
        const res2 = await fetch(`/api/visits?sellerId=${cob.seller_id}`, { credentials: 'include', headers });
        const data2 = await res2.json();
        const all2 = Array.isArray(data2) ? data2 : [];
        const filtered2 = all2.filter((v) => String(v.visit_date || v.created_at || '').slice(0, 10) === hoyISO);
        setVisitas(filtered2.slice(0, 20));
      } else {
        setVisitas(all);
      }
    } catch {}
  }

  // Cargar visitas del cobro para el día
  useEffect(() => {
    if (!selectedCobro) return;
    loadVisitasForCobro(selectedCobro);
  }, [selectedCobro, cobros]);

  async function handleRegistrar() {
    setMsg('');
    setErr('');
    if (!selectedCobro || !selectedCliente) {
      setErr('Selecciona cobro y cliente');
      return;
    }
    const cob = cobros.find((c) => c.id === selectedCobro);
    if (!cob) {
      setErr('Cobro no válido');
      return;
    }
    const items = productos
      .map((p) => ({
        product_id: p.id,
        quantity: Number(cantidades[p.id] || 0),
        unit_price: Number(p.price || 0),
        stock: stockMap[p.id] ?? Number(p.stock || 0),
        name: p.name,
      }))
      .filter((it) => it.quantity > 0);
    for (const it of items) {
      if (it.quantity > it.stock) {
        setErr(`Cantidad de ${it.name} excede stock (${it.stock})`);
        return;
      }
    }
    const paymentVal = Number(abono || 0);
    if (items.length === 0 && !paymentVal) {
      setErr('Indica abono o al menos un producto con cantidad');
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/visits', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          customerId: selectedCliente,
          sellerId: cob.seller_id,
          cobroId: selectedCobro,
          items,
          payment: paymentVal,
          paymentMethod: metodo,
          notes: nota,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg(`Visita registrada ✓ ${data.visit_id?.slice(0, 8)} · ${items.length} prod · $${paymentVal.toLocaleString()} ${metodo}`);
      setCantidades({});
      setAbono('');
      setNota('');
      // recargar visitas del cobro
      await loadVisitasForCobro(selectedCobro);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const cobroActual = cobros.find((c) => c.id === selectedCobro);
  const clienteActual = clientes.find((c) => c.id === selectedCliente);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo — {hoyStr}</p>
        <h1 className="text-2xl font-black text-slate-900">Registrar Visita</h1>
        <p className="text-xs text-slate-500">Mostrando {cobros.length} cobros del día ({['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][hoyDia]})</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Izquierda: Registrar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Registrar visita</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Cobro *</label>
              <select
                value={selectedCobro}
                onChange={(e) => setSelectedCobro(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200 mt-1"
              >
                {cobros.length === 0 && <option>No hay cobros hoy</option>}
                {cobros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.grupo} ({c.seller_name || c.seller_id?.slice(0, 6)})
                  </option>
                ))}
              </select>
              {cobroActual && <p className="text-[11px] text-slate-500 mt-1">{cobroActual.recorrido} · {cobroActual.observacion}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Cliente *</label>
              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200 mt-1"
              >
                {clientes.length === 0 && <option>No hay clientes para este cobro</option>}
                {clientes.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name} — {cl.phone}
                  </option>
                ))}
              </select>
              {clienteActual && <p className="text-[11px] text-slate-500 mt-1">{clienteActual.address || 'Sin dirección'}</p>}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[2fr_70px_70px] gap-2 text-[11px] font-bold text-[#2563eb] bg-blue-50 px-2 py-2">
                <span>PRODUCTO</span>
                <span className="text-center">STOCK</span>
                <span className="text-center">CANT.</span>
              </div>
              <div className="max-h-[220px] overflow-auto divide-y divide-slate-100">
                {loading ? (
                  <p className="text-center text-xs text-slate-400 py-4">Cargando productos...</p>
                ) : productos.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No hay productos</p>
                ) : (
                  productos.map((p) => {
                    const stk = stockMap[p.id] ?? Number(p.stock || 0);
                    return (
                      <div key={p.id} className="grid grid-cols-[2fr_70px_70px] gap-2 px-2 py-2 items-center hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{money(p.price)} · {p.category}</p>
                        </div>
                        <span className={`text-center text-xs font-black ${stk <= 5 ? 'text-red-600' : stk <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>{stk}</span>
                        <input
                          type="number"
                          min="0"
                          max={stk}
                          placeholder="0"
                          value={cantidades[p.id] || ''}
                          onChange={(e) => setCantidades({ ...cantidades, [p.id]: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm text-center text-slate-900 font-bold bg-white"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="$ Abono"
                value={abono}
                onChange={(e) => setAbono(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold bg-white"
              />
              <div className="col-span-2 flex gap-1">
                <button
                  onClick={() => setMetodo('Efectivo')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${metodo === 'Efectivo' ? 'bg-[#2563eb] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setMetodo('Nequi')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${metodo === 'Nequi' ? 'bg-[#2563eb] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  Nequi
                </button>
              </div>
            </div>
            <input
              placeholder="Nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
            />
            {msg && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</p>}
            {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            <button
              onClick={handleRegistrar}
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold"
            >
              {saving ? 'Registrando...' : 'Registrar'}
            </button>
            <p className="text-[11px] text-slate-500 text-center">Se registrará para {clienteActual?.name || 'cliente seleccionado'} en {cobroActual?.name || 'cobro'}</p>
          </div>
        </div>

        {/* Derecha: Visitas registradas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Visitas registradas del cobro: {cobroActual?.name || '—'}</h3>
          <p className="text-xs text-slate-500 mb-3">Vendedor: {cobroActual?.seller_name || '—'} · {visitas.length} visitas hoy</p>
          <div className="bg-[#2563eb] text-white text-[11px] font-bold grid grid-cols-5 px-2 py-2 rounded-t-lg">
            <span>CLIENTE</span>
            <span>ANTERIOR</span>
            <span>VENTA</span>
            <span>ABONO</span>
            <span>DEUDA</span>
          </div>
          <div className="border border-slate-200 rounded-b-lg overflow-auto max-h-[320px]">
            {visitas.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">Sin visitas en esta fecha</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {visitas.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-2 py-2 font-bold text-slate-900 truncate max-w-[100px]" title={v.cliente}>
                        {v.cliente || v.cliente_id?.slice(0, 6) || 'Cliente'}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-600">{money(v.anterior)}</td>
                      <td className="px-2 py-2 text-center font-bold text-slate-900">{money(v.venta)}</td>
                      <td className="px-2 py-2 text-center font-bold text-emerald-600">{money(v.abono)}</td>
                      <td className={`px-2 py-2 text-center font-bold ${Number(v.deuda) > 0 ? 'text-red-600' : 'text-slate-600'}`}>{money(v.deuda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Clientes del cobro: {clientes.length} · Productos disponibles: {productos.length}</p>
        </div>
      </div>
    </div>
  );
}
