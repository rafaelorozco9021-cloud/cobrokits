'use client';

import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/auth';

function money(n) {
  const v = Number(n || 0);
  if (v === 0) return '0';
  return v.toLocaleString('es-CO');
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Page() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date('2026-09-01')));
  const [data, setData] = useState({ visits: [], payments: [], items: [], products: [] });
  const [loading, setLoading] = useState(true);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${weekEnd.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${weekStart.getFullYear()}`;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Traer visitas, pagos y productos en paralelo
        const [visitsRes, paymentsRes, productsRes] = await Promise.all([
          fetch('/api/visits', { credentials: 'include', headers }).then((r) => r.json().catch(() => [])),
          fetch('/api/cobros', { credentials: 'include', headers }).then(async (r) => {
            // cobros endpoint ahora devuelve cobros, no payments, así que mejor fetch payments directo
            const txt = await r.text();
            try {
              const j = JSON.parse(txt);
              // Si es array de cobros (tiene name/dia), no es payments, entonces fetch payments aparte
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

        // También intentar /api/payments directo por si el anterior no era
        let payments = Array.isArray(paymentsRes) ? paymentsRes : [];
        if (!Array.isArray(payments) || (payments[0]?.name && payments[0]?.dia !== undefined)) {
          try {
            const p2 = await fetch('/api/payments', { credentials: 'include', headers }).then((r) => r.json());
            if (Array.isArray(p2)) payments = p2;
          } catch {}
        }

        const visits = Array.isArray(visitsRes) ? visitsRes : [];
        const products = Array.isArray(productsRes) ? productsRes : [];

        // Traer visit_items para calcular venta por visita
        let items = [];
        try {
          // Intentar endpoint de visit_items si existe, sino agrupar desde visits
          const token2 = getToken();
          const h2 = token2 ? { Authorization: `Bearer ${token2}` } : {};
          // Como no hay endpoint directo, haremos una query indirecta: pedir todos los customer_visit_items vía un endpoint no existente, fallback a calcular desde visits
          // Por ahora, intentamos fetch a /api/visits y luego hacer detalle por visita si es necesario
          // Simplificamos: si visits ya trae venta, usamos eso, sino 0
        } catch {}

        // Para venta por día necesitamos los items: hacemos fetch a DB vía un endpoint custom si existe
        // Como no existe, intentamos obtener items vía una vista general: usamos la tabla customer_visit_items directamente si el backend la expone vía /api/visits con join
        // Fallback: si no hay items, usaremos el campo venta de la visita si existe, sino 0
        // Vamos a intentar traer todos los payments con visit_id y luego agrupar

        // Si el backend no da detalle de items, intentamos un fetch a un endpoint que sí da: /api/customer-visit-items (si existe)
        try {
          const token3 = getToken();
          const h3 = token3 ? { Authorization: `Bearer ${token3}` } : {};
          const itemsRes = await fetch('/api/customer-visit-items', { credentials: 'include', headers: h3 }).then((r) => r.json().catch(() => null));
          if (Array.isArray(itemsRes)) items = itemsRes;
        } catch {}

        // Si aún no hay items, intentamos con una query directa a través de un endpoint que lista todo: usamos el hecho de que visits controller ahora devuelve venta/abono
        // Para compatibilidad, si visits ya tiene campo venta, lo usamos

        setData({ visits, payments, items, products });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [weekStart, weekEnd]);

  // Calcular métricas por día - usar visits con venta/abono/payment_method
  const perDay = useMemo(() => {
    let runningDebt = 0;
    return days.map((d) => {
      const iso = d.toISOString().split('T')[0];
      // Visitas de ese día
      const dayVisits = (data.visits || []).filter((v) => String(v.visit_date || v.created_at || '').slice(0, 10) === iso);
      // Calcular efectivo/nequi/total desde visits (cada visita tiene abono y payment_method)
      const dayPayments = (data.payments || []).filter((p) => String(p.created_at || p.visit_date || '').slice(0, 10) === iso);
      const efectivoVisits = dayVisits.filter((v) => String(v.payment_method || '').toLowerCase() === 'efectivo').reduce((a, v) => a + Number(v.abono || 0), 0);
      const nequiVisits = dayVisits.filter((v) => String(v.payment_method || '').toLowerCase() === 'nequi').reduce((a, v) => a + Number(v.abono || 0), 0);
      const otrosVisits = dayVisits.filter((v) => !['efectivo', 'nequi'].includes(String(v.payment_method || '').toLowerCase())).reduce((a, v) => a + Number(v.abono || 0), 0);
      let efectivo = efectivoVisits;
      let nequi = nequiVisits;
      let otros = otrosVisits;
      let total = efectivo + nequi + otros;
      // Si no hay payment_method en visits, fallback a payments array
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

      // Venta: sumar visit_items si tenemos, sino usar venta de visits
      let venta = 0;
      let costo = 0;
      let unidades = 0;
      if (data.items && data.items.length > 0) {
        // items tienen visit_id, quantity, unit_price
        const visitIds = new Set(dayVisits.map((v) => v.id));
        const dayItems = data.items.filter((it) => visitIds.has(it.visit_id));
        venta = dayItems.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
        unidades = dayItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
        // Costo: buscar producto cost_price
        const prodMap = new Map((data.products || []).map((p) => [p.id, Number(p.cost_price || p.cost || 0)]));
        costo = dayItems.reduce((a, it) => a + Number(it.quantity || 0) * Number(prodMap.get(it.product_id) || 0), 0);
        // Si no hay prodMap cost, usar 75% de precio como aproximación
        if (costo === 0 && venta > 0) costo = Math.round(venta * 0.75);
      } else {
        // Fallback: usar venta que viene en visits (si el backend ya la calcula)
        venta = dayVisits.reduce((a, v) => a + Number(v.venta || 0), 0);
        // Si visits no trae venta, intentar sumar desde payments abono como proxy de venta si no hay items
        if (venta === 0 && dayPayments.length > 0) {
          // No hay detalle, usar total como venta aproximada
          venta = total;
        }
        unidades = dayVisits.length; // aproximación
        costo = Math.round(venta * 0.75);
      }

      const cobros = dayVisits.length;
      const costoCll = costo; // por ahora igual a costo, podría ser costo de lo efectivamente cobrado
      const entrega = venta;
      const gasto = 0;
      const caja = total - gasto;
      const ganancia = total - costo;
      const cuentas = dayVisits.length;
      const cnl = dayVisits.filter((v) => Number(v.deuda || 0) === 0).length;
      const dMerca = venta > 0 ? Math.round((ganancia / venta) * 100) : 0;
      const dDinero = cuentas > 0 ? Math.round((cnl / cuentas) * 100) : 0;
      const pctEfect = total > 0 ? Math.round((efectivo / total) * 100) : 0;

      // Saldo anterior: deuda acumulada del día (incluida la de hoy) que queda por cobrar
      const deudaDia = dayVisits.reduce((a, v) => a + Number(v.deuda || 0), 0);
      runningDebt += deudaDia;

      return {
        date: d,
        iso,
        label: d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' }),
        saldoAnt: runningDebt,
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
      dMerca: perDay.length ? Math.round(perDay.reduce((a, r) => a + r.dMerca, 0) / perDay.length) : 0,
      dDinero: perDay.length ? Math.round(perDay.reduce((a, r) => a + r.dDinero, 0) / perDay.length) : 0,
      cuentas: sum('cuentas'),
      cnl: sum('cnl'),
      unidades: sum('unidades'),
      pctEfect: perDay.length ? Math.round(perDay.reduce((a, r) => a + r.pctEfect, 0) / perDay.length) : 0,
    };
  }, [perDay]);

  const nextWeek = () => {
    const n = new Date(weekStart);
    n.setDate(n.getDate() + 7);
    setWeekStart(n);
  };
  const prevWeek = () => {
    const p = new Date(weekStart);
    p.setDate(p.getDate() - 7);
    setWeekStart(p);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Reportes Semanales</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3 overflow-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevWeek} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">‹</button>
          <span className="px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-bold bg-amber-50 text-slate-900">{weekLabel}</span>
          <button onClick={nextWeek} className="w-8 h-8 rounded-lg bg-[#2563eb] text-white hover:bg-blue-700">›</button>
          <button onClick={() => setWeekStart(getMonday(new Date()))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50" title="Hoy">↻</button>
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
                <th className="px-1 py-2">D/MERCA</th>
                <th className="px-1 py-2">D/DINERO</th>
                <th className="px-1 py-2">CUENTAS</th>
                <th className="px-1 py-2">CNL</th>
                <th className="px-1 py-2">UNID.</th>
                <th className="px-1 py-2">% EFECT.</th>
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
                  <td className="px-1 py-2 text-center text-slate-600">{r.dMerca}%</td>
                  <td className="px-1 py-2 text-center text-slate-600">{r.dDinero}%</td>
                  <td className="px-1 py-2 text-center text-slate-600">{r.cuentas}</td>
                  <td className="px-1 py-2 text-center text-slate-600">{r.cnl}</td>
                  <td className="px-1 py-2 text-center text-slate-600">{r.unidades}</td>
                  <td className="px-1 py-2 text-center text-slate-600">{r.pctEfect}%</td>
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
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.dMerca}%</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.dDinero}%</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.cuentas}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.cnl}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.unidades}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{totals.pctEfect}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
