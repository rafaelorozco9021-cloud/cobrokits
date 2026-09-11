import { MapPin, Navigation, Clock, CheckCircle2 } from 'lucide-react';

export default function GpsPreview() {
  return (
    <section className="py-20 lg:py-24 bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500">
              Módulo GPS Avanzado
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Auditoría y Rastreo de Rutas en Tiempo Real
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Supervisa las paradas exactas, valide que las entregas a crédito ocurran en el domicilio
              registrado y reduzca tiempos muertos entre clientes.
            </p>

            <ul className="space-y-3 pt-2">
              {[
                'Verificación geográfica al registrar la cobranza',
                'Detección automática de desviación de ruta',
                'Historial navegable de paradas y minutos en cliente',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Map Simulation */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-2xl overflow-hidden min-h-[380px] flex flex-col justify-between">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between bg-slate-800/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-white block">Ruta #04 - Cobrador: Carlos M.</span>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      En Progreso • 12 de 15 Clientes
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold px-2.5 py-1 rounded-md">
                  GPS Activo
                </span>
              </div>

              {/* Pins */}
              <div className="relative z-10 my-8 px-2 sm:px-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-lg shadow-emerald-500/30 shrink-0">
                    1
                  </div>
                  <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-xs shadow">
                    <span className="font-bold text-white block">Abarrotes Don Pedro</span>
                    <span className="text-slate-400">Cobrado: $150.00 • 09:15 AM • Verificado GPS</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-lg shadow-amber-500/30 shrink-0 animate-pulse">
                    2
                  </div>
                  <div className="bg-slate-800/90 p-3 rounded-xl border border-amber-500/30 text-xs shadow">
                    <span className="font-bold text-white block">Mercadito San José (Ubicación Actual)</span>
                    <span className="text-amber-400 font-medium">En proceso de entrega...</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                    3
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs">
                    <span className="font-bold text-slate-300 block">Tienda La Esperanza</span>
                    <span className="text-slate-500">Pendiente • ETA 10:30 AM</span>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/90 backdrop-blur-md p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300">
                    Tiempo restante: <strong className="text-white">45 min</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300">
                    Efectividad: <strong className="text-white">98%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
