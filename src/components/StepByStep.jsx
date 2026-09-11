import { Building2, PackagePlus, Users2, BadgeCheck } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Crea tu Empresa',
    desc: 'Registra tu negocio, datos fiscales y configura tus sucursales o bodegas de inventario principal.',
    icon: Building2,
  },
  {
    num: '02',
    title: 'Carga tus Productos',
    desc: 'Define precios de venta al contado, crédito, promociones y el stock disponible en bodega.',
    icon: PackagePlus,
  },
  {
    num: '03',
    title: 'Asigna Vendedores y Rutas',
    desc: 'Crea el perfil para tus cobradores o vendedores y asígnales la mercancía para su ruta diaria.',
    icon: Users2,
  },
  {
    num: '04',
    title: 'Recauda en Tiempo Real',
    desc: 'Visualiza ventas cobradas, créditos dejados y dinero en efectivo levantado en campo instantáneamente.',
    icon: BadgeCheck,
  },
];

export default function StepByStep() {
  return (
    <section id="how-it-works" className="py-20 lg:py-24 bg-slate-950 border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-500">
            Implementación Simplificada
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Configura tu Negocio Operativo en 4 Pasos
          </p>
          <p className="text-slate-400">
            Diseñado para integrarse rápidamente a la dinámica real de distribuidores calle a calle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
          {/* connector line desktop */}
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-950/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black text-slate-700">{step.num}</span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
