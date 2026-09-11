'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Shield } from 'lucide-react';

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const [gpsAddon, setGpsAddon] = useState(true);

  const plans = [
    {
      name: 'Plan Básico',
      desc: 'Ideal para distribuidores o fabricantes pequeños.',
      vendorsCount: 3,
      baseMonthly: 29,
      baseAnnual: 23,
      features: [
        'Hasta 3 Vendedores en Calle',
        'Inventario de Bodega Principal',
        'Registro de Ventas Contado / Crédito',
        'Sincronización Offline App',
      ],
    },
    {
      name: 'Plan Crecimiento',
      desc: 'Para empresas con múltiples rutas y alta cobranza.',
      vendorsCount: 10,
      baseMonthly: 79,
      baseAnnual: 63,
      featured: true,
      features: [
        'Hasta 10 Vendedores en Calle',
        'Multi-bodegas e Inventario de Vehículo',
        'Reportes Avanzados de Carteras y Mora',
        'Cuadre Automatizado de Caja Diaria',
        'Soporte Prioritario WhatsApp',
      ],
    },
    {
      name: 'Plan Empresarial',
      desc: 'Operaciones mayoristas de gran volumen.',
      vendorsCount: 25,
      baseMonthly: 169,
      baseAnnual: 135,
      features: [
        'Más de 10 Vendedores (Hasta 25)',
        'Acceso API + Integración ERP',
        'Gestor de Cuenta Dedicado',
        'Auditoría Avanzada de Transacciones',
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-24 bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Planes Transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Matriz de Precios Flexible</h2>
          <p className="text-slate-400">Todas las cuentas empiezan con <span className="text-emerald-400 font-bold">1 mes gratis</span> con acceso total. Al terminar la prueba eliges tu plan.</p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={`text-sm font-semibold ${!annual ? 'text-white' : 'text-slate-400'}`}>Mensual</span>
            <button
              role="switch"
              aria-checked={annual}
              aria-label="Cambiar a facturación anual"
              onClick={() => setAnnual(!annual)}
              className="w-14 h-8 bg-slate-800 rounded-full p-1 border border-slate-700 relative transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <div
                className={`w-6 h-6 rounded-full bg-emerald-500 shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-2 ${annual ? 'text-white' : 'text-slate-400'}`}>
              Anual{' '}
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                Ahorra 20%
              </span>
            </span>
          </div>

          {/* GPS Addon */}
          <label className="inline-flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 mt-4 cursor-pointer hover:border-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={gpsAddon}
              onChange={(e) => setGpsAddon(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-xs sm:text-sm text-slate-200 font-medium">
              Añadir Módulo GPS en Tiempo Real{' '}
              <span className="text-emerald-400 font-bold">(+$5/mes por vendedor)</span>
            </span>
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan) => {
            const basePrice = annual ? plan.baseAnnual : plan.baseMonthly;
            const gpsCost = gpsAddon ? plan.vendorsCount * 5 : 0;
            const finalPrice = basePrice + gpsCost;

            return (
              <div
                key={plan.name}
                className={`rounded-3xl p-7 lg:p-8 flex flex-col justify-between relative transition-all ${
                  plan.featured
                    ? 'bg-slate-800 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 scale-[1.02]'
                    : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    Más Popular
                  </span>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${finalPrice}</span>
                    <span className="text-slate-400 text-sm font-medium"> USD / mes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 -mt-3">
                    {annual ? 'Facturado anualmente' : 'Facturado mensual'} • {plan.vendorsCount} vendedores
                    {gpsAddon ? ` + GPS` : ''}
                  </p>

                  <ul className="space-y-3 pt-4 border-t border-slate-800">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                    {gpsAddon && (
                      <li className="flex items-start gap-3 text-sm text-amber-400 font-semibold">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Incluye Rastreo GPS Activo ({plan.vendorsCount} vendedores)</span>
                      </li>
                    )}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className={`mt-8 w-full py-3.5 rounded-xl text-sm font-bold text-center transition-all block ${
                    plan.featured
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  Probar 1 mes gratis
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          Sin compromisos de permanencia. Cancela o cambia de plan en cualquier momento.
        </div>
      </div>
    </section>
  );
}
