import Link from 'next/link';
import { MapPin, Box, MessageCircle } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400">
      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-amber-900/40 border-b border-slate-800 py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Comienza a controlar tus ventas en calle hoy mismo.
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Únete a cientos de empresas distribuidoras que ya eliminaron la pérdida de dinero e inventario con
            CobroKits.
          </p>
          <div className="pt-2">
            <a
              href="#pricing"
              className="px-8 py-4 rounded-xl text-base font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20 inline-flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
              Crear Cuenta y Probar Gratis
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold overflow-hidden">
                <MapPin className="w-5 h-5 absolute text-slate-950" />
                <Box className="w-3 h-3 absolute translate-x-1 -translate-y-1 text-slate-950" />
              </div>
              <span className="text-lg font-black text-white">
                Cobro<span className="text-emerald-400">Kits</span> SaaS
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Plataforma especializada en la gestión operativa y financiera de distribución puerta a puerta,
              cobros a crédito y control de stock móvil. Backend NestJS + Next.js.
            </p>
            <div className="flex gap-2 pt-2">
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                Offline First
              </span>
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                GPS Auditoría
              </span>
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                API Ready
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Navegación</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  ¿Cómo Funciona?
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Planes y Precios
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal & Soporte</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Términos del Servicio
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Seguridad de Datos
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Soporte WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {year} CobroKits SaaS. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            Hecho para distribuidores calle a calle <span className="w-1 h-1 rounded-full bg-slate-600" /> v1.0
          </p>
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/1234567890"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacto por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95"
      >
        <MessageCircle className="w-7 h-7 fill-white text-white" />
      </a>
    </footer>
  );
}
