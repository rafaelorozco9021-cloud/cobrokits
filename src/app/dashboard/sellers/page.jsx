'use client';
import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';

export default function SellersPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const token = (()=>{ try{return localStorage.getItem('cobrokits_token')}catch{return null}})();
        const res = await fetch('/api/dashboard?action=sellers', { credentials:'include', headers: token?{Authorization:`Bearer ${token}`}:{} });
        const j = await res.json();
        if(!res.ok) throw new Error(j.error||j.message);
        setSellers(j);
      } catch(e){ setErr(e.message)} finally{ setLoading(false)}
    })();
  },[]);
  if(loading) return <div className="flex items-center gap-2 text-slate-400 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin"/> Cargando vendedores...</div>;
  if(err) return <p className="text-red-400 text-sm p-6 rounded-xl bg-red-500/10 border border-red-500/20">{err}</p>;
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-black text-white flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400"/> Vendedores ({sellers.length})</h1>
      <div className="grid gap-3">
        {sellers.map(s=> (
          <div key={s.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
            <div><p className="font-bold text-white">{s.name}</p><p className="text-xs text-slate-500">{s.email||s.phone} • {s.status}</p></div>
            <span className="text-xs font-mono text-slate-500">{s.id.slice(0,8)}</span>
          </div>
        ))}
        {sellers.length===0 && <p className="text-slate-500 text-center py-8">Sin datos</p>}
      </div>
    </div>
  );
}
