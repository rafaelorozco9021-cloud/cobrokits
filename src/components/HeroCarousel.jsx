'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Smartphone,
  Truck,
  MapPin,
} from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'Dashboard de Control General',
    subtitle: 'Monitoreo consolidado de ventas, caja global y mercancía en tránsito',
    icon: LayoutDashboard,
    badge: 'Consola Principal',
    metrics: [
      { label: 'Caja Recaudada Hoy', value: '$12,450 USD' },
      { label: 'Rutas Activas', value: '18 Vendedores' },
      { label: 'Efectividad Cobro', value: '94.2%' },
    ],
  },
  {
    id: 2,
    title: 'Módulo Móvil del Vendedor',
    subtitle: 'Cobros puerta a puerta, registro a crédito y emisión de tickets al instante',
    icon: Smartphone,
    badge: 'App de Campo',
    metrics: [
      { label: 'Venta Contado', value: '$450.00' },
      { label: 'Crédito Asignado', value: '$1,200.00' },
      { label: 'Modo Offline', value: 'Sincronizado' },
    ],
  },
  {
    id: 3,
    title: 'Control de Inventario Móvil',
    subtitle: 'Carga diaria por vehículo, control de merma y liquidación de inventario',
    icon: Truck,
    badge: 'Bodega Móvil',
    metrics: [
      { label: 'Stock en Carga', value: '1,420 Unids' },
      { label: 'Devoluciones', value: '0.4%' },
      { label: 'Diferencias', value: '$0.00' },
    ],
  },
  {
    id: 4,
    title: 'Rastreo GPS & Geocercas',
    subtitle: 'Rutas recorridas, paradas del cobrador y tiempos de visita auditados',
    icon: MapPin,
    badge: 'Monitoreo Vivo',
    metrics: [
      { label: 'Clientes Visitados', value: '34 / 40' },
      { label: 'Tiempo Promedio', value: '8.5 min' },
      { label: 'Desvío de Ruta', value: '0%' },
    ],
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Auto-play cada 10s con desvanecimiento lento - siempre activo, respeta paused via ref
  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      if (document.hidden) return;
      setIsFading(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setIsFading(false);
      }, 600);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx) => {
    if (idx === current) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setIsFading(false);
    }, 400);
  };
  const prev = () => goTo(current === 0 ? slides.length - 1 : current - 1);
  const next = () => goTo((current + 1) % slides.length);
  const ActiveIcon = slides[current].icon;

  return (
    <section className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-28 bg-slate-900">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Copy */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4" />
              Gestión de Distribución Calle a Calle
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white tracking-tight leading-[1.05]">
              Toma el control total de tus{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
                ventas en calle
              </span>{' '}
              y recaudos.
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Administra tus vendedores de ruta, controla la mercancía en campo, elimina las pérdidas de
              inventario y cuadra la caja diaria sin dolores de cabeza.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <a
                href="/register"
                className="px-8 py-4 rounded-xl text-base font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                Un mes gratis
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#features"
                className="px-6 py-4 rounded-xl text-base font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current text-emerald-400" />
                Ver Video Demostrativo
              </a>
            </div>

            <p className="text-xs text-slate-500">
              Sin tarjeta requerida • Cancela cuando quieras • Soporte en español
            </p>
          </div>

          {/* Right Carousel - Vista previa interactiva */}
          <div
            className="lg:col-span-6"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <p className="text-center text-xs font-bold tracking-widest uppercase text-amber-500 mb-3 lg:hidden">↓ Vista previa interactiva ↓</p>
            <div className="relative rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-2xl shadow-slate-950 backdrop-blur-xl ring-1 ring-emerald-500/10">
              {/* Header - con fade */}
              <div
                className={`flex items-center justify-between pb-4 border-b border-slate-700/60 transition-opacity duration-700 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <ActiveIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                      {slides[current].badge}
                    </span>
                    <h3 className="text-[15px] font-bold text-white leading-tight">{slides[current].title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Anterior"
                    onClick={prev}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    aria-label="Siguiente"
                    onClick={next}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content - desvanecimiento lento */}
              <div
                className={`py-6 space-y-6 transition-opacity duration-700 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
              >
                <p className="text-sm text-slate-300">{slides[current].subtitle}</p>

                <div className="grid grid-cols-3 gap-3">
                  {slides[current].metrics.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1 leading-tight">
                        {m.label}
                      </span>
                      <span className="text-sm sm:text-[15px] font-extrabold text-white leading-tight">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-40 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-500/20 to-transparent" />
                  <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-20 relative z-10">
                    {[40, 65, 45, 80, 55, 90, 75, 100].map((h, i) => (
                      <div key={i} className="w-full bg-slate-800 rounded-t-sm overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-1000 ease-in-out"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicators */}
              <div className="flex justify-center gap-2 pt-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Ir a slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all duration-500 ${current === i ? 'w-8 bg-amber-500' : 'w-2 bg-slate-700 hover:bg-slate-600'}`}
                  />
                ))}
              </div>
            </div>

            {/* Trust row */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronización en tiempo real con backend NestJS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
