'use client';
export default function Page() {
  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Imprimir Cobros</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <select className="border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200">
            <option>Hoy (2026-09-01 (mar))</option>
          </select>
        </div>
        <p className="text-center text-xs text-slate-500 py-10">No hay clientes para cobrar en esta fecha.</p>
      </div>
    </div>
  );
}
