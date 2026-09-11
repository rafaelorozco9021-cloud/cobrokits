import { CreditCard, WifiOff, Calculator, ShoppingBag } from 'lucide-react';

const features = [
  {
    icon: CreditCard,
    title: 'Gestión de Crédito y Cobranza',
    desc: 'Historial detallado de productos dejados en la visita anterior, cobro de cuotas semanales y saldo actualizado por cliente.',
    badge: 'Cobranza Efectiva',
  },
  {
    icon: WifiOff,
    title: 'Sincronización Offline First',
    desc: '¿Sin señal en la ruta? El vendedor registra ventas y cobranzas sin interrupciones. Todo se auto-sincroniza al detectar red.',
    badge: 'Cero Interrupciones',
  },
  {
    icon: Calculator,
    title: 'Cuadre de Caja Automatizado',
    desc: 'Auditoría instantánea al final de la jornada: mercancía entregada vs. efectivo ingresado vs. saldo fiado al cliente.',
    badge: 'Cierre Seguro',
  },
  {
    icon: ShoppingBag,
    title: 'Catálogo Digital Móvil Ultra-Rápido',
    desc: 'Interfaz optimizada para smartphones económicos. Permite levantar pedidos con 2 toques sin ralentizar al vendedor.',
    badge: 'Agilidad en Campo',
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20 lg:py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Control Operativo Completo
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Creado para Desafíos Reales del Mercado Puerta a Puerta
          </p>
          <p className="text-slate-400">Todo lo que necesitas para eliminar fugas y escalar tu distribución.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-slate-800/50 rounded-2xl p-7 lg:p-8 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80 transition-all hover:shadow-xl hover:shadow-slate-950/30 space-y-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-700 text-slate-300 whitespace-nowrap">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{feat.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
