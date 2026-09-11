'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function RoiCalculator() {
  const [vendors, setVendors] = useState(5);
  const estimatedSavings = vendors * 280;

  return (
    <section className="py-20 lg:py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-800/90 rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-700 shadow-2xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wide border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
              Calculadora de Impacto Financiero
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ¿Cuánto Dinero Estás Perdiendo en Calle?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              Calcula el ahorro mensual estimado al erradicar mermas, cobros no registrados y pérdidas de
              stock.
            </p>
          </div>

          <div className="space-y-4 max-w-xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <label htmlFor="vendorsRange" className="text-sm font-bold text-slate-200">
                Número de Vendedores / Cobradores:
              </label>
              <span className="text-xl font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-xl text-center">
                {vendors} {vendors === 1 ? 'Vendedor' : 'Vendedores'}
              </span>
            </div>

            <input
              id="vendorsRange"
              type="range"
              min="1"
              max="30"
              value={vendors}
              onChange={(e) => setVendors(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>1</span>
              <span>15</span>
              <span>30+</span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-emerald-500/30 text-center space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Ahorro y Recaudo Adicional Est. Mensual
            </span>
            <div className="flex items-center justify-center gap-1 text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
              <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 -mr-1" />
              {estimatedSavings.toLocaleString('en-US')} USD
              <span className="text-sm text-slate-400 font-normal self-end mb-2">/ mes</span>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              * Basado en la reducción del 95% de mermas e inconsistencias en la liquidación de caja diaria.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
