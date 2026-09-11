'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: '¿Qué pasa si mi vendedor se queda sin internet en la calle durante la ruta?',
    a: 'El sistema cuenta con arquitectura Offline-First. La aplicación móvil guarda localmente las ventas, créditos y cobros. Al volver a tener conexión (Wi-Fi o datos), todo se sincroniza de forma automática con el servidor central.',
  },
  {
    q: '¿Cómo ayuda el sistema a recuperar el dinero de productos dejados a crédito la semana anterior?',
    a: 'Cada cliente tiene una hoja de ruta digital. El cobrador ve la deuda exacta, el historial de pagos anteriores y los compromisos fijados. Esto evita disputas sobre saldos pendientes y acelera la cobranza.',
  },
  {
    q: '¿Es fácil de usar para vendedores que no son expertos en tecnología?',
    a: 'Sí. La app móvil fue diseñada para operaciones en la calle: botones amplios, proceso de cobro en 3 pasos y flujos simplificados para cualquier smartphone Android gama media/baja.',
  },
  {
    q: '¿Puedo probar el sistema con mi empresa antes de pagar?',
    a: 'Ofrecemos un mes gratis totalmente gratuito con acceso a todas las funcionalidades para que cargues tus productos y realices pruebas en ruta sin compromiso. Al vencerse el mes, al loguearte te redirigimos a Planes para elegir obligatoriamente tu suscripción.',
  },
  {
    q: '¿Cómo funciona la geolocalización de los vendedores?',
    a: 'El GPS registra las coordenadas al realizar cada cobro o venta, además de rastrear el recorrido en segundo plano para auditoría de la ruta realizada y validación geográfica.',
  },
  {
    q: '¿Cómo se realiza la integración o importación de mis productos actuales?',
    a: 'Puedes importar tu catálogo completo mediante una plantilla de Excel en menos de 5 minutos desde el panel de administración web. Soporte incluido.',
  },
];

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="py-20 lg:py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500">
            Resuelve tus Dudas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Preguntas Frecuentes</h2>
          <p className="text-slate-400 text-sm">Todo lo que necesitas saber antes de empezar.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-colors ${isOpen ? 'border-slate-700' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <span className="font-bold text-slate-100 text-sm sm:text-base leading-tight">{faq.q}</span>
                  <span
                    className={`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 transition-transform ${isOpen ? 'rotate-180 bg-slate-700' : ''}`}
                  >
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4 animate-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
