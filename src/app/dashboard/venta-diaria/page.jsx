'use client';

import { useEffect, useState, useMemo } from 'react';
import { getToken } from '@/lib/auth';
import { bogotaDayKey } from '@/lib/dates';
import ThWithTooltip from '@/components/ThWithTooltip';
import { buildCreditRow, buildCashRow, buildMarginRow, sumDayCash, sumDaySale, sumHistoryDebt } from '@/lib/report-blocks';

function money(n) {
  const v = Number(n || 0);
  if (v === 0) return '0';
  return v.toLocaleString('es-CO');
}

export default function Page() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [data, setData] = useState({ visits: [], products: [], items: [] });
  const [loading, setLoading] = useState(true);
  // Bloque 2 (caja): GASTO opcional por vendedor (default 0) y $ digitado
  // (override opcional para validar cuadre: $ debe = TOTAL - GASTO).
  const [gastosBySeller, setGastosBySeller] = useState({});
  const [entregadoBySeller, setEntregadoBySeller] = useState({});
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
        let items = [];
        try {
          const itemsRes = await fetch('/api/customer-visit-items', { credentials: 'include', headers }).then((r) => r.json().catch(() => null));
          if (Array.isArray(itemsRes)) items = itemsRes;
        } catch {}
        setData({ visits, products, items });
      } catch {}
      setLoading(false);
    }
    load();
  }, [isoDate, tick]);

  const perSeller = useMemo(() => {
    const dayVisits = (data.visits || []).filter((v) => bogotaDayKey(v.visit_date || v.created_at) === isoDate);
    // Semana actual: lunes a domingo que contiene selectedDate. La deuda
    // inicial (SALDO ANT.) por vendedor es la deuda neta acumulada ANTES del
    // lunes: Σ(venta − cobrado). La fórmula vieja usaba Σ(venta) bruta, lo que
    // inflaba el saldo (más el bug ENTREGA = SALDO + COBROS − TOTAL).
    const sel = new Date(selectedDate);
    const day = sel.getDay();
    const diff = sel.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(sel);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartKey = bogotaDayKey(weekStart);
    // Agrupar por seller_id
    const map = new Map();
    for (const v of dayVisits) {
      const sid = v.seller_id;
      if (!map.has(sid)) map.set(sid, { seller_id: sid, vendedor: v.vendedor || v.seller_name || String(sid).slice(0, 6), visits: [] });
      map.get(sid).visits.push(v);
    }
    const dayKeyOf = (x) => bogotaDayKey(x);
    const result = [];
    for (const [sid, group] of map.entries()) {
      // ENTRADAS OBSERVADAS del vendedor (misma fuente que semanal/mensual).
      const sellerItems = (data.items || []).length > 0
        ? (data.items || []).filter((it) => new Set(group.visits.map((v) => v.id)).has(it.visit_id))
        : [];
      const recaudo = sumDayCash(group.visits, []);
      const cobradoHoy = recaudo.efectivo + recaudo.nequi; // = TOTAL observado
      const sale = sumDaySale(group.visits, sellerItems, data.products);
      const venta = sale.venta;
      const costo = sale.costo;
      const costoCll = venta; // valor de venta de lo entregado hoy
      const tieneMovimiento = venta > 0 || cobradoHoy > 0;
      // BLOQUE 1 — deuda inicial = neto histórico Σ(venta − cobrado) del
      // vendedor antes del lunes (fórmula vieja: Σ(venta) bruta → inflaba).
      // 0 si no hay movimiento hoy. ENTREGA = COBROS − TOTAL (corr.).
      const deudaInicial = sumHistoryDebt(data.visits, { beforeKey: weekStartKey, dayKeyOf, sellerId: sid }).deuda;
      const saldoAnt = tieneMovimiento ? deudaInicial : 0;
      const credit = tieneMovimiento
        ? buildCreditRow({ deudaInicial: saldoAnt, entregadoCreditoHoy: costoCll, cobradoHoy })
        : { saldoAnt: 0, cobros: 0, costoCll: 0, entrega: 0 };
      // BLOQUE 2 — cierre con gasto opcional (default 0) + validación $.
      // No lee valores de deuda.
      const cashRow = buildCashRow({
        efectivo: recaudo.efectivo,
        nequi: recaudo.nequi,
        gasto: gastosBySeller[sid] ?? 0,
        entregadoOverride: entregadoBySeller[sid] ?? null,
      });
      // BLOQUE 3 — margen informativo (no mezcla caja ni deuda).
      const margin = buildMarginRow({ costo, costoCll });
      result.push({
        vendedor: group.vendedor,
        seller_id: sid,
        saldoAnt: credit.saldoAnt,
        cobros: credit.cobros,
        costo,
        costoCll,
        efectivo: recaudo.efectivo,
        nequi: recaudo.nequi,
        total: cashRow.total,
        entrega: credit.entrega,
        gasto: cashRow.gasto,
        caja: cashRow.caja,
        cajaEsperada: cashRow.cajaEsperada,
        cuadra: cashRow.cuadra,
        diferenciaCaja: cashRow.diferencia,
        ganancia: margin.margen,
      });
    }
    // Ordenar por vendedor
    result.sort((a, b) => a.vendedor.localeCompare(b.vendedor));
    return result;
  }, [data, isoDate, selectedDate, gastosBySeller, entregadoBySeller]);

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
        <p className="text-[11px] text-slate-500">GASTO y $ los ingresa el vendedor (verde). GANANCIA = margen potencial (COSTO CLL − COSTO).</p>
        {perSeller.some((r) => !r.cuadra) && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
            ⚠ $ no cuadra en {perSeller.filter((r) => !r.cuadra).length} vendedor(es): $ debe ser = TOTAL − GASTO. Revisa digitación o posible faltante.
          </div>
        )}
        <div className="overflow-auto">
          <table className="w-full text-[11px] border border-slate-200 min-w-[1100px]">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <ThWithTooltip tip="Vendedor / cobrador. Cada fila agrupa todas las visitas de ese vendedor en el día seleccionado." className="text-left">VENDEDOR</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — Deuda inicial del vendedor: neto Σ(venta − cobrado) acumulado antes del lunes.">SALDO ANT.</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — COBROS = SALDO ANT. + COSTO CLL (ya incluye el saldo).">COBROS</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 3 — Costo de inversión de lo entregado hoy por ese vendedor. Solo informativo.">COSTO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUES 1 y 3 — COSTO CLL. = valor de venta de lo entregado hoy por ese vendedor.">COSTO CLL.</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Recaudo en efectivo de ese vendedor. SUM(abono WHERE payment_method='efectivo').">EFECTIVO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Recaudo por Nequi de ese vendedor. SUM(abono WHERE payment_method='nequi').">NEQUI</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — TOTAL = EFECTIVO + NEQUI.">TOTAL</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 1 — Deuda final (corr.): ENTREGA = COBROS − TOTAL. Se propaga como SALDO ANT. siguiente.">ENTREGA</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — Gastos del día del vendedor (editable, default 0).">GASTO</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 2 — $ = TOTAL − GASTO. Si no cuadra se marca en rojo."> $</ThWithTooltip>
                <ThWithTooltip tip="BLOQUE 3 — Margen potencial: GANANCIA = COSTO CLL − COSTO.">GANANCIA</ThWithTooltip>
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
                  <tr key={r.seller_id} className={`border-t border-slate-200 hover:bg-slate-50 ${!r.cuadra ? 'bg-red-50/60' : ''}`}>
                    <td className="px-2 py-2 font-bold text-slate-900">{r.vendedor}</td>
                    <td className="px-1 py-2 text-center text-slate-600">{money(r.saldoAnt)}</td>
                    <td className="px-1 py-2 text-center font-bold">{money(r.cobros)}</td>
                    <td className="px-1 py-2 text-center">{money(r.costo)}</td>
                    <td className="px-1 py-2 text-center">{money(r.costoCll)}</td>
                    <td className="px-1 py-2 text-center text-emerald-700 font-bold">{money(r.efectivo)}</td>
                    <td className="px-1 py-2 text-center text-blue-700 font-bold">{money(r.nequi)}</td>
                    <td className="px-1 py-2 text-center font-black">{money(r.total)}</td>
                    <td className="px-1 py-2 text-center">{money(r.entrega)}</td>
                    <td className="px-1 py-2 text-center bg-emerald-50/60">
                      <input
                        type="number"
                        min="0"
                        value={gastosBySeller[r.seller_id] ?? 0}
                        onChange={(e) => setGastosBySeller((m) => ({ ...m, [r.seller_id]: Number(e.target.value || 0) }))}
                        className="w-20 rounded border border-emerald-300 bg-white px-1 py-0.5 text-center text-slate-900"
                        title="Gasto del día (opcional, default 0)"
                      />
                    </td>
                    <td className={`px-1 py-2 text-center font-bold ${r.cuadra ? 'text-slate-900 bg-emerald-50/60' : 'text-red-700 bg-red-100'}`} title={r.cuadra ? `$ = TOTAL − GASTO ✓` : `$ digitado (${money(r.caja)}) ≠ TOTAL − GASTO (${money(r.cajaEsperada)}). Posible error o faltante.`}>
                      <input
                        type="number"
                        value={entregadoBySeller[r.seller_id] ?? r.cajaEsperada}
                        onChange={(e) => setEntregadoBySeller((m) => ({ ...m, [r.seller_id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className={`w-20 rounded border px-1 py-0.5 text-center font-bold ${r.cuadra ? 'border-emerald-300 bg-white text-slate-900' : 'border-red-400 bg-white text-red-700'}`}
                        title="$ entregado por el vendedor (debe = TOTAL − GASTO)"
                      />
                      {!r.cuadra && <div className="text-[9px] font-black">⚠ dif. {money(r.diferenciaCaja)}</div>}
                    </td>
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
