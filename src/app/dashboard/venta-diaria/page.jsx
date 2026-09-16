'use client';

import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/auth';
import { bogotaDayKey } from '@/lib/dates';

function money(n) {
  const v = Number(n || 0);
  if (v === 0) return '0';
  return v.toLocaleString('es-CO');
}

export default function Page() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [data, setData] = useState({ visits: [], products: [] });
  const [loading, setLoading] = useState(true);
  // Tick de actualización en tiempo real: polling + foco/visibilidad
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    const onFocus = () => setTick((x) => x + 1);
    const onVis = () => { if (!document.hidden) setTick((x) => x + 1); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const isoDate = bogotaDayKey(selectedDate);
  const label = selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [visitsRes, productsRes] = await Promise.all([
          fetch('/api/visits', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
          fetch('/api/products', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
        ]);
        const visits = Array.isArray(visitsRes) ? visitsRes : [];
        const products = Array.isArray(productsRes) ? productsRes : [];
        setData({ visits, products });
      } catch {}
      setLoading(false);
    }
    load();
  }, [isoDate, tick]);

  const perSeller = useMemo(() => {
    const dayVisits = (data.visits || []).filter((v) => bogotaDayKey(v.visit_date || v.created_at) === isoDate);
    // Saldo del día por vendedor: solo deuda generada ese día (sin arrastre)
    const debtBySeller = new Map();
    for (const v of dayVisits) {
      const sid = v.seller_id;
      debtBySeller.set(sid, (debtBySeller.get(sid) || 0) + Number(v.deuda || 0));
    }
    // Agrupar por seller_id
    const map = new Map();
    for (const v of dayVisits) {
      const sid = v.seller_id;
      if (!map.has(sid)) map.set(sid, { seller_id: sid, vendedor: v.vendedor || v.seller_name || sid.slice(0, 6), visits: [] });
      map.get(sid).visits.push(v);
    }
    // Si no hay sellers con visitas, igualmente mostrar todos los sellers con 0? Para demo, mostrar al menos los que tienen visits
    // También agregar sellers sin visitas con 0 para completar lista si es necesario
    const result = [];
    for (const [sid, group] of map.entries()) {
      const cobros = group.visits.length;
      const efectivo = group.visits.filter((v) => String(v.payment_method || '').toLowerCase() === 'efectivo').reduce((a, v) => a + Number(v.abono || 0), 0);
      const nequi = group.visits.filter((v) => String(v.payment_method || '').toLowerCase() === 'nequi').reduce((a, v) => a + Number(v.abono || 0), 0);
      const total = efectivo + nequi + group.visits.filter((v) => !['efectivo', 'nequi'].includes(String(v.payment_method || '').toLowerCase())).reduce((a, v) => a + Number(v.abono || 0), 0);
      const venta = group.visits.reduce((a, v) => a + Number(v.venta || 0), 0);
      const costo = Math.round(venta * 0.75);
      const entrega = venta;
      const gasto = 0;
      const caja = total - gasto;
      const ganancia = total - costo;
      result.push({
        vendedor: group.vendedor,
        seller_id: sid,
        saldoAnt: debtBySeller.get(sid) || 0,
        cobros,
        costo,
        costoCll: costo,
        efectivo,
        nequi,
        total,
        entrega,
        gasto,
        caja,
        ganancia,
      });
    }
    // Ordenar por vendedor
    result.sort((a, b) => a.vendedor.localeCompare(b.vendedor));
    return result;
  }, [data, isoDate]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  const goToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Venta Diaria</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevDay} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">‹</button>
          <span className="px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-bold bg-amber-50 text-slate-900 capitalize">{label}</span>
          <button onClick={nextDay} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">›</button>
          <button onClick={goToday} className="px-2 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold">Hoy</button>
          <button onClick={() => setSelectedDate(new Date(selectedDate))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600">↻</button>
          <button className="w-8 h-8 rounded-lg bg-[#2563eb] text-white text-xs">⎙</button>
          <button className="w-8 h-8 rounded-lg bg-[#2563eb] text-white text-xs">⎙</button>
          {loading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <p className="text-xs">
          <span className="font-bold">Vendedor:</span> Todos los vendedores · {perSeller.length} con ventas hoy
        </p>
        <p className="text-[11px] text-slate-500">Las celdas en verde son editables. Gasto y $ los ingresa el vendedor. Ganancia = Total - Costo</p>
        <div className="overflow-auto">
          <table className="w-full text-[11px] border border-slate-200 min-w-[1100px]">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="px-2 py-2 text-left">VENDEDOR</th>
                <th className="px-1 py-2">SALDO ANT.</th>
                <th className="px-1 py-2">COBROS</th>
                <th className="px-1 py-2">COSTO</th>
                <th className="px-1 py-2">COSTO CLL.</th>
                <th className="px-1 py-2">EFECTIVO</th>
                <th className="px-1 py-2">NEQUI</th>
                <th className="px-1 py-2">TOTAL</th>
                <th className="px-1 py-2">ENTREGA</th>
                <th className="px-1 py-2">GASTO</th>
                <th className="px-1 py-2">$</th>
                <th className="px-1 py-2">GANANCIA</th>
              </tr>
            </thead>
            <tbody>
              {perSeller.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-6 text-xs text-slate-400">
                    No hay datos para esta fecha
                  </td>
                </tr>
              ) : (
                perSeller.map((r) => (
                  <tr key={r.seller_id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-2 py-2 font-bold text-slate-900">{r.vendedor}</td>
                    <td className="px-1 py-2 text-center text-slate-600">{money(r.saldoAnt)}</td>
                    <td className="px-1 py-2 text-center font-bold">{r.cobros}</td>
                    <td className="px-1 py-2 text-center">{money(r.costo)}</td>
                    <td className="px-1 py-2 text-center">{money(r.costoCll)}</td>
                    <td className="px-1 py-2 text-center text-emerald-700 font-bold">{money(r.efectivo)}</td>
                    <td className="px-1 py-2 text-center text-blue-700 font-bold">{money(r.nequi)}</td>
                    <td className="px-1 py-2 text-center font-black">{money(r.total)}</td>
                    <td className="px-1 py-2 text-center">{money(r.entrega)}</td>
                    <td className="px-1 py-2 text-center">{money(r.gasto)}</td>
                    <td className="px-1 py-2 text-center font-bold">{money(r.caja)}</td>
                    <td className={`px-1 py-2 text-center font-black ${r.ganancia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{money(r.ganancia)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
