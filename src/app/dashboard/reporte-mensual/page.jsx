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
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [data, setData] = useState({ visits: [], payments: [], items: [], products: [] });
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

  const monthLabel = `${currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} · ${currentMonth.getFullYear()}`;

  const days = useMemo(() => {
    const count = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  }, [currentMonth]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [visitsRes, paymentsRes, productsRes] = await Promise.all([
          fetch('/api/visits', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
          fetch('/api/cobros', { credentials: 'include', headers }).then(async (r) => {
            const txt = await r.text();
            try {
              const j = JSON.parse(txt);
              if (Array.isArray(j) && j[0]?.name && j[0]?.dia !== undefined) {
                const pRes = await fetch('/api/payments', { credentials: 'include', headers }).then((rr) => rr.json().catch(() => []));
                return pRes;
              }
              return j;
            } catch {
              return [];
            }
          }),
          fetch('/api/products', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
        ]);

        let payments = Array.isArray(paymentsRes) ? paymentsRes : [];
        if (!Array.isArray(payments) || (payments[0]?.name && payments[0]?.dia !== undefined)) {
          try {
            const p2 = await fetch('/api/payments', { credentials: 'include', headers }).then((r) => r.json());
            if (Array.isArray(p2)) payments = p2;
          } catch {}
        }

        const visits = Array.isArray(visitsRes) ? visitsRes : [];
        const products = Array.isArray(productsRes) ? productsRes : [];

        let items = [];
        try {
          const token3 = getToken();
          const h3 = token3 ? { Authorization: `Bearer ${token3}` } : {};
          const itemsRes = await fetch('/api/customer-visit-items', { credentials: 'include', headers: h3 }).then((r) => r.json().catch(() => null));
          if (Array.isArray(itemsRes)) items = itemsRes;
        } catch {}

        setData({ visits, payments, items, products });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
      load();
  }, [currentMonth, tick]);

  // Mismas métricas por día que el reporte semanal
  const perDay = useMemo(() => {
    return days.map((d) => {
      const iso = bogotaDayKey(d);
      const dayVisits = (data.visits || []).filter((v) => bogotaDayKey(v.visit_date || v.created_at) === iso);
      const dayPayments = (data.payments || []).filter((p) => bogotaDayKey(p.created_at || p.visit_date) === iso);
      const efectivoVisits = dayVisits.filter((v) => String(v.payment_method || '').toLowerCase() === 'efectivo').reduce((a, v) => a + Number(v.abono || 0), 0);
      const nequiVisits = dayVisits.filter((v) => String(v.payment_method || '').toLowerCase() === 'nequi').reduce((a, v) => a + Number(v.abono || 0), 0);
      const otrosVisits = dayVisits.filter((v) => !['efectivo', 'nequi'].includes(String(v.payment_method || '').toLowerCase())).reduce((a, v) => a + Number(v.abono || 0), 0);
      let efectivo = efectivoVisits;
      let nequi = nequiVisits;
      let otros = otrosVisits;
      let total = efectivo + nequi + otros;
      if (total === 0 && dayPayments.length > 0) {
        const f = dayPayments.filter((p) => String(p.payment_method || '').toLowerCase() === 'efectivo').reduce((a, p) => a + Number(p.amount || 0), 0);
        const n = dayPayments.filter((p) => String(p.payment_method || '').toLowerCase() === 'nequi').reduce((a, p) => a + Number(p.amount || 0), 0);
        const o = dayPayments.filter((p) => !['efectivo', 'nequi'].includes(String(p.payment_method || '').toLowerCase())).reduce((a, p) => a + Number(p.amount || 0), 0);
        if (f + n + o > 0) {
          efectivo = f;
          nequi = n;
          otros = o;
          total = f + n + o;
        }
      }

      let venta = 0;
      let costo = 0;
      let unidades = 0;
      if (data.items && data.items.length > 0) {
        const visitIds = new Set(dayVisits.map((v) => v.id));
        const dayItems = data.items.filter((it) => visitIds.has(it.visit_id));
        venta = dayItems.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
        unidades = dayItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
        const prodMap = new Map((data.products || []).map((p) => [p.id, Number(p.cost_price || p.cost || 0)]));
        costo = dayItems.reduce((a, it) => a + Number(it.quantity || 0) * Number(prodMap.get(it.product_id) || 0), 0);
        if (costo === 0 && venta > 0) costo = Math.round(venta * 0.75);
      } else {
        venta = dayVisits.reduce((a, v) => a + Number(v.venta || 0), 0);
        if (venta === 0 && dayPayments.length > 0) {
          venta = total;
        }
        unidades = dayVisits.length;
        costo = Math.round(venta * 0.75);
      }

      const cobros = dayVisits.length;
      const costoCll = costo;
      const entrega = venta;
      const gasto = 0;
      const caja = total - gasto;
      const ganancia = total - costo;
      const cuentas = dayVisits.length;
      const cnl = dayVisits.filter((v) => Number(v.deuda || 0) === 0).length;
      const dMerca = venta > 0 ? Math.round((ganancia / venta) * 100) : 0;
      const dDinero = cuentas > 0 ? Math.round((cnl / cuentas) * 100) : 0;
      const pctEfect = total > 0 ? Math.round((efectivo / total) * 100) : 0;

      // Saldo del día: solo la deuda generada ESE día (no se arrastra a los siguientes)
      const deudaDia = dayVisits.reduce((a, v) => a + Number(v.deuda || 0), 0);

      return {
        date: d,
        iso,
        saldoAnt: deudaDia,
        cobros,
        costo,
        costoCll,
        efectivo,
        nequi,
        total,
        entrega,
        gasto,
        caja,
        ganancia,
        dMerca,
        dDinero,
        cuentas,
        cnl,
        unidades,
        pctEfect,
      };
    });
  }, [days, data]);

  const totals = useMemo(() => {
    const sum = (key) => perDay.reduce((a, r) => a + Number(r[key] || 0), 0);
    return {
      saldoAnt: sum('saldoAnt'),
      cobros: sum('cobros'),
      costo: sum('costo'),
      costoCll: sum('costoCll'),
      efectivo: sum('efectivo'),
      nequi: sum('nequi'),
      total: sum('total'),
      entrega: sum('entrega'),
      gasto: sum('gasto'),
      caja: sum('caja'),
      ganancia: sum('ganancia'),
    };
  }, [perDay]);

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Reporte Mensual</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3 overflow-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">‹</button>
          <span className="px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-bold bg-amber-50 text-slate-900 capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">›</button>
          <button onClick={() => setCurrentMonth(new Date())} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50" title="Hoy">↻</button>
          <button className="px-2 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs">⎙</button>
          <button className="px-2 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs">⎙</button>
          {loading && <span className="text-xs text-slate-400 ml-2">Cargando...</span>}
        </div>
        <p className="text-xs">
          <span className="font-bold">Vendedor:</span> Todos los vendedores
        </p>
        <p className="text-[11px] text-slate-500">Las celdas en verde son editables. El resto se calcula automáticamente. Ganancia = Total - Costo</p>
        <div className="overflow-auto">
          <table className="w-full text-[11px] border border-slate-200 min-w-[1200px]">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="px-2 py-2 text-left">FECHA</th>
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
                <th className="px-1 py-2 bg-emerald-500">GANANCIA</th>
              </tr>
            </thead>
            <tbody>
              {perDay.map((r) => (
                <tr key={r.iso} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-2 py-2 font-bold text-slate-900">
                    {r.date.toLocaleDateString('es-CO', { weekday: 'long' })} <br />
                    <span className="text-[10px] font-normal text-slate-500">{r.date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </td>
                  <td className="px-1 py-2 text-center text-slate-600">{money(r.saldoAnt)}</td>
                  <td className="px-1 py-2 text-center font-bold text-slate-900">{r.cobros || 0}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.costo)}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.costoCll)}</td>
                  <td className="px-1 py-2 text-center text-emerald-700 font-bold">{money(r.efectivo)}</td>
                  <td className="px-1 py-2 text-center text-blue-700 font-bold">{money(r.nequi)}</td>
                  <td className="px-1 py-2 text-center font-black text-slate-900">{money(r.total)}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.entrega)}</td>
                  <td className="px-1 py-2 text-center text-slate-600">{money(r.gasto)}</td>
                  <td className="px-1 py-2 text-center font-bold text-slate-900">{money(r.caja)}</td>
                  <td className={`px-1 py-2 text-center font-black ${r.ganancia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{money(r.ganancia)}</td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-black border-t-2 border-slate-300">
                <td className="px-2 py-2 text-[#2563eb]">Total</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.saldoAnt)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.cobros}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.costo)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.costoCll)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.efectivo)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.nequi)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.total)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.entrega)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.gasto)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.caja)}</td>
                <td className="px-1 py-2 text-center text-emerald-700">{money(totals.ganancia)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
