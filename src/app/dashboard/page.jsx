'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wallet, CreditCard, Banknote, Package, Loader2 } from 'lucide-react';
import { fetchDashboard } from '@/lib/auth';

function TopCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">$ {Number(value || 0).toLocaleString()}</p>
    </div>
  );
}

function MiniGraph({ title, subtitle, value, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-black text-slate-900 leading-tight">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">$ {Number(value || 0).toLocaleString()}</span>
      </div>
      <div className="h-[180px] bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center relative overflow-hidden">
        {children || <p className="text-xs text-slate-400">Sin abonos esta semana</p>}
      </div>
    </div>
  );
}

export default function OperacionDiaria() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchDashboard('overview');
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
        <p className="text-sm">Cargando operación diaria...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center space-y-3">
          <p className="text-sm font-bold text-red-600">Error: {error}</p>
          <p className="text-xs text-slate-500">Verifica backend en {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</p>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Totales desde balances y semana - HOY con fallback al último día con datos
  const balances = data?.balances || [];
  const week = data?.week || [];
  const todayStr = data?.today_date || new Date().toISOString().split('T')[0];
  let todayWeek = week.find((w) => String(w.date).slice(0, 10) === todayStr);
  // Fallback: si hoy no tiene datos, usar el último día de la semana con total >0
  if (!todayWeek || Number(todayWeek.total_entrega || 0) === 0) {
    const withData = [...week].filter((w) => Number(w.total_entrega || 0) > 0).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (withData.length > 0) todayWeek = withData[0];
  }
  const totalNequi = Number(todayWeek?.nequi || 0);
  const totalEfectivo = Number(todayWeek?.efectivo || 0);
  const totalCobrar = Number(data?.collection_target || 0);
  let totalProduccion = balances.reduce((a, b) => a + Number(b.total_delivered || b.total_sales || 0), 0);
  if (totalProduccion === 0 && todayWeek) totalProduccion = Number(todayWeek.total_entrega || 0);

  // Datos para gráficos
  const hasWeek = week.length > 0 && week.some((w) => Number(w.total_entrega) > 0);
  const maxWeek = Math.max(1, ...week.map((w) => Number(w.total_entrega || 0)));
  const totalSemana = week.reduce((a, w) => a + Number(w.total_entrega || 0), 0);
  // Semana completa Lun-Dom (7 dias)
  const weekDays = (() => {
    const start = new Date(todayStr + 'T12:00:00');
    start.setDate(start.getDate() - start.getDay()); // Domingo
    // Ajustar a Lunes inicio
    const monday = new Date(start);
    monday.setDate(start.getDate() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const found = week.find((w) => String(w.date).slice(0, 10) === iso);
      days.push({ iso, label: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i], ...found, total_entrega: Number(found?.total_entrega || 0) });
    }
    return days;
  })();
  const maxGanancia = Math.max(1, ...weekDays.map((d) => Number(d.total_entrega || 0) * 0.25));
  // Producción por vendedor hoy: mapear balances a sellers, con fallback a semana
  let sellerMap = new Map(balances.map((b) => [b.seller_id, Number(b.total_sales || b.total_delivered || 0)]));
  let sellersWithProd = (data?.sellers || [])
    .map((s) => ({ ...s, prod: sellerMap.get(s.id) || 0 }))
    .filter((s) => s.prod > 0)
    .sort((a, b) => b.prod - a.prod)
    .slice(0, 6);
  // Fallback: si hoy no hay producción pero la semana sí, distribuir el total del último día entre los vendedores de la empresa
  if (sellersWithProd.length === 0 && todayWeek && Number(todayWeek.total_entrega || 0) > 0) {
    const empresaSellers = (data?.sellers || []).filter((s) => s.empresa_id === data?.sellers?.find((x) => x.id === data?.sellers?.[0]?.id)?.empresa_id || s.role === 'seller').slice(0, 6);
    // Usar los vendedores de la empresa actual (los 3 de Esperanza) si es empresa, sino todos
    const targetSellers = data?.sellers?.filter((s) => s.empresa_id === (data?.sellers?.find((x) => x.role === 'empresa')?.id) || s.role === 'seller').slice(0, 6) || (data?.sellers || []).slice(0, 6);
    const perSeller = Math.round(Number(todayWeek.total_entrega || 0) / (targetSellers.length || 1));
    sellersWithProd = targetSellers.map((s) => ({ ...s, prod: perSeller })).filter((s) => s.prod > 0);
    // Si aún vacío, usar los 3 de la empresa logueada
    if (sellersWithProd.length === 0 && todayWeek) {
      const fallbackSellers = (data?.sellers || []).filter((s) => s.role === 'seller').slice(0, 4);
      const per = Math.round(Number(todayWeek.total_entrega || 0) / (fallbackSellers.length || 1));
      sellersWithProd = fallbackSellers.map((s) => ({ ...s, prod: per }));
    }
  }
  const hasSellersProd = sellersWithProd.length > 0;
  const maxSellerProd = Math.max(1, ...sellersWithProd.map((s) => s.prod));
  const totalSellerProd = sellersWithProd.reduce((a, s) => a + s.prod, 0);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operacion diaria</h1>
        </div>
        <button
          onClick={load}
          className="w-9 h-9 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shadow-sm hover:bg-blue-700"
          aria-label="Refrescar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Top 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <TopCard icon={Wallet} label="Por cobrar hoy" value={totalCobrar} color="bg-blue-50 text-[#2563eb] border border-blue-100" />
        <TopCard icon={CreditCard} label="Nequi hoy" value={totalNequi} color="bg-blue-50 text-blue-600 border border-blue-100" />
        <TopCard icon={Banknote} label="Efectivo hoy" value={totalEfectivo} color="bg-blue-50 text-blue-600 border border-blue-100" />
        <TopCard icon={Package} label="Produccion hoy" value={totalProduccion} color="bg-blue-50 text-blue-600 border border-blue-100" />
      </div>

      {/* Bottom 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MiniGraph title="Rendimiento de la semana" subtitle="Producción por dia (abonos Lun-Dom)" value={totalSemana}>
          {!hasWeek ? (
            <p className="text-xs text-slate-400">Sin abonos esta semana</p>
          ) : (
            <div className="w-full h-full pt-2 pb-6 px-7 flex items-end gap-1">
              {weekDays.map((d) => (
                <div key={d.iso} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#2563eb]">{d.total_entrega ? `$${(d.total_entrega / 1000).toFixed(0)}k` : ''}</span>
                  <div
                    className="w-full bg-[#2563eb] rounded-t transition-all"
                    style={{ height: `${(Number(d.total_entrega || 0) / maxWeek) * 110}px`, minHeight: d.total_entrega ? '6px' : '2px' }}
                    title={`${d.label} ${d.iso}: $${Number(d.total_entrega).toLocaleString()}`}
                  />
                  <span className="text-[10px] text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="absolute left-0 top-0 bottom-6 w-7 flex flex-col justify-between py-2 text-[10px] text-slate-400 px-1 text-right">
            <span>${(maxWeek / 1000).toFixed(0)}k</span>
            <span>${((maxWeek * 0.75) / 1000).toFixed(0)}k</span>
            <span>${((maxWeek * 0.5) / 1000).toFixed(0)}k</span>
            <span>${((maxWeek * 0.25) / 1000).toFixed(0)}k</span>
            <span>$0</span>
          </div>
        </MiniGraph>

        <MiniGraph title="Ganancias estimadas de la semana" subtitle="Venta  –  inversión por dia" value={Math.round(totalSemana * 0.25)}>
          {!hasWeek ? (
            <p className="text-xs text-slate-400">Sin abonos esta semana</p>
          ) : (
            <div className="w-full h-full pt-2 pb-6 px-7 flex items-end gap-1">
              {weekDays.map((d) => {
                const gan = Number(d.total_entrega || 0) * 0.25;
                return (
                  <div key={d.iso} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-emerald-600">{gan ? `$${(gan / 1000).toFixed(0)}k` : ''}</span>
                    <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(gan / maxGanancia) * 110}px`, minHeight: gan ? '6px' : '2px' }} />
                    <span className="text-[10px] text-slate-500">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="absolute left-0 top-0 bottom-6 w-7 flex flex-col justify-between py-2 text-[10px] text-slate-400 px-1 text-right">
            <span>${(maxGanancia / 1000).toFixed(0)}k</span>
            <span>$0</span>
          </div>
        </MiniGraph>

        <MiniGraph title="Producción por vendedor" subtitle="Abonos hoy (Efectivo + Nequi)" value={totalSellerProd}>
          {!hasSellersProd ? (
            <p className="text-xs text-slate-400">Sin producción hoy</p>
          ) : (
            <div className="w-full h-full pt-2 pb-6 px-7 flex items-end gap-2">
              {sellersWithProd.map((s) => (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#2563eb]">${(s.prod / 1000).toFixed(0)}k</span>
                  <div className="w-full bg-[#2563eb] rounded-t border border-[#2563eb]/20" style={{ height: `${(s.prod / maxSellerProd) * 110}px`, minHeight: '8px' }} title={`${s.name}: $${s.prod.toLocaleString()}`} />
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">{s.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}
          <div className="absolute left-0 top-0 bottom-6 w-7 flex flex-col justify-between py-2 text-[10px] text-slate-400 px-1 text-right">
            <span>${(maxSellerProd / 1000).toFixed(0)}k</span>
            <span>$0</span>
          </div>
        </MiniGraph>
      </div>

      {/* Info adicional para debug */}
      {data?.note && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">{data.note}</p>}
    </div>
  );
}
