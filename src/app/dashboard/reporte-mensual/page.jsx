'use client';

import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/auth';
import { bogotaDayKey } from '@/lib/dates';
import ThWithTooltip from '@/components/ThWithTooltip';
import { computeDeudaInicial, computePeriodRows, buildPeriodTotals } from '@/lib/report-blocks';

function money(n) {
  const v = Number(n || 0);
  if (v === 0) return '0';
  return v.toLocaleString('es-CO');
}

export default function Page() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [data, setData] = useState({ visits: [], payments: [], items: [], products: [] });
  const [loading, setLoading] = useState(true);
  // Bloque 2 (caja): GASTO opcional por día (default 0) y $ digitado por el
  // vendedor (override opcional para validar cuadre: $ debe = TOTAL - GASTO).
  const [gastosByKey, setGastosByKey] = useState({});
  const [entregadoByKey, setEntregadoByKey] = useState({});
  const [showAudit, setShowAudit] = useState(false);
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

  // Deuda inicial del periodo (SALDO ANT. del mes):
  // CORREGIDA = Σ(venta − cobrado) histórico antes del día 1.
  // La fórmula vieja usaba Σ(venta) bruta + bug ENTREGA = SALDO + COBROS − TOTAL.
  const deudaInicial = useMemo(() => {
    const periodStartKey = bogotaDayKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    return computeDeudaInicial({
      visits: data.visits,
      periodStartKey,
      dayKeyOf: (v) => bogotaDayKey(v),
    });
  }, [data.visits, currentMonth]);

  // Filas del mes con los 3 bloques independientes + arrastre de deuda.
  const period = useMemo(() => {
    return computePeriodRows({
      days,
      visits: data.visits,
      payments: data.payments,
      items: data.items,
      products: data.products,
      deudaInicialPeriodo: deudaInicial.deudaInicialNew,
      deudaInicialOldPeriodo: deudaInicial.deudaInicialOld,
      dayKeyOf: (v) => bogotaDayKey(v),
      gastosByKey,
      entregadoByKey,
    });
  }, [days, data, deudaInicial, gastosByKey, entregadoByKey]);

  const perDay = period.rows;

  // ENTREGA total = deuda final del último día con movimiento (no se suma).
  const totals = useMemo(() => buildPeriodTotals(perDay, period), [perDay, period]);

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
        <p className="text-[11px] text-slate-500">GASTO y $ son editables (verde). El resto se calcula automáticamente. GANANCIA = margen potencial (COSTO CLL − COSTO).</p>
        {perDay.some((r) => !r.cuadra) && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
            ⚠ $ no cuadra en {perDay.filter((r) => !r.cuadra).length} día(s): $ debe ser = TOTAL − GASTO. Revisa digitación o posible faltante.
          </div>
        )}
        {deudaInicial.sesgoAcumulado !== 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-slate-700">
            <button onClick={() => setShowAudit((v) => !v)} className="font-bold text-slate-900 underline">
              {showAudit ? 'Ocultar auditoría del bug anterior ▾' : 'Ver auditoría del bug anterior ▸'}
            </button>
            <span className="ml-2">
              Saldo inicial corregido: {money(deudaInicial.deudaInicialNew)} · Fórmula vieja habría mostrado: {money(deudaInicial.deudaInicialOld)} ·
              Desvío acumulado: {money(deudaInicial.sesgoAcumulado)}.
            </span>
            {showAudit && (
              <p className="mt-1 text-[10px] text-slate-500">Fórmula vieja: ENTREGA = SALDO ANT. + COBROS − TOTAL (duplicaba el saldo). Corregida: ENTREGA = COBROS − TOTAL. Deuda final del mes — vieja: {money(period.entregaOldPeriodo)}, corregida: {money(period.deudaFinalPeriodo)}, sesgo: {money(period.sesgoPeriodo)}.</p>
            )}
          </div>
        )}
        <div className="overflow-auto">
          <table className="w-full text-[11px] border border-slate-200 min-w-[1200px]">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <ThWithTooltip tip="Fecha del día del mes. Cada fila es un día del mes seleccionado." className="text-left">FECHA</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — Deuda inicial: deuda final del día anterior CON movimiento.">SALDO ANT.</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — COBROS = SALDO ANT. + COSTO CLL (ya incluye el saldo).">COBROS</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 3 — Costo de inversión de lo entregado hoy. Solo informativo.">COSTO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUES 1 y 3 — COSTO CLL. = valor de venta de lo entregado hoy.">COSTO CLL.</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Recaudo en efectivo. SUM(abono WHERE payment_method='efectivo').">EFECTIVO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Recaudo por Nequi. SUM(abono WHERE payment_method='nequi').">NEQUI</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — TOTAL = EFECTIVO + NEQUI.">TOTAL</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — Deuda final (corr.): ENTREGA = COBROS − TOTAL. Se propaga como SALDO ANT. siguiente.">ENTREGA</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Gastos del día (editable, default 0).">GASTO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — $ = TOTAL − GASTO. Si no cuadra se marca en rojo."> $</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 3 — Margen potencial: GANANCIA = COSTO CLL − COSTO." className="bg-emerald-500">GANANCIA</ThWithTooltip>
              </tr>
            </thead>
            <tbody>
              {perDay.map((r) => (
                <tr key={r.iso} className={`border-t border-slate-200 hover:bg-slate-50 ${!r.cuadra ? 'bg-red-50/60' : ''}`}>
                  <td className="px-2 py-2 font-bold text-slate-900">
                    {r.date.toLocaleDateString('es-CO', { weekday: 'long' })} <br />
                    <span className="text-[10px] font-normal text-slate-500">{r.date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </td>
                  <td className="px-1 py-2 text-center text-slate-600">{money(r.saldoAnt)}</td>
                  <td className="px-1 py-2 text-center font-bold text-slate-900">{money(r.cobros)}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.costo)}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.costoCll)}</td>
                  <td className="px-1 py-2 text-center text-emerald-700 font-bold">{money(r.efectivo)}</td>
                  <td className="px-1 py-2 text-center text-blue-700 font-bold">{money(r.nequi)}</td>
                  <td className="px-1 py-2 text-center font-black text-slate-900">{money(r.total)}</td>
                  <td className="px-1 py-2 text-center text-slate-700">{money(r.entrega)}</td>
                  <td className="px-1 py-2 text-center bg-emerald-50/60">
                    <input
                      type="number"
                      min="0"
                      value={gastosByKey[r.iso] ?? 0}
                      onChange={(e) => setGastosByKey((m) => ({ ...m, [r.iso]: Number(e.target.value || 0) }))}
                      className="w-20 rounded border border-emerald-300 bg-white px-1 py-0.5 text-center text-slate-900"
                      title="Gasto del día (opcional, default 0)"
                    />
                  </td>
                  <td className={`px-1 py-2 text-center font-bold ${r.cuadra ? 'text-slate-900 bg-emerald-50/60' : 'text-red-700 bg-red-100'}`} title={r.cuadra ? `$ = TOTAL − GASTO ✓` : `$ digitado (${money(r.caja)}) ≠ TOTAL − GASTO (${money(r.cajaEsperada)}). Posible error o faltante.`}>
                    <input
                      type="number"
                      value={entregadoByKey[r.iso] ?? r.cajaEsperada}
                      onChange={(e) => setEntregadoByKey((m) => ({ ...m, [r.iso]: e.target.value === '' ? '' : Number(e.target.value) }))}
                      className={`w-20 rounded border px-1 py-0.5 text-center font-bold ${r.cuadra ? 'border-emerald-300 bg-white text-slate-900' : 'border-red-400 bg-white text-red-700'}`}
                      title="$ entregado por el vendedor (debe = TOTAL − GASTO)"
                    />
                    {!r.cuadra && <div className="text-[9px] font-black">⚠ dif. {money(r.diferenciaCaja)}</div>}
                  </td>
                  <td className={`px-1 py-2 text-center font-black ${r.ganancia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{money(r.ganancia)}</td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-black border-t-2 border-slate-300">
                <td className="px-2 py-2 text-[#2563eb]">Total</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.saldoAnt)}</td>
                <td className="px-1 py-2 text-center text-[#2563eb]">{money(totals.cobros)}</td>
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
