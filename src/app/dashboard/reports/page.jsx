'use client';
import Link from 'next/link';
export default function Page() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-black text-white capitalize">Reportes</h1>
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
        <p className="text-slate-400 text-sm">
          Reportes diarios/semanales/mensuales. Backend: <code className="text-emerald-400">/api/daily-report, /api/weekly-report, /api/monthly-report</code>
        </p>
        <Link href="/dashboard" className="inline-flex px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold">
          Volver al Overview
        </Link>
      </div>
    </div>
  );
}
