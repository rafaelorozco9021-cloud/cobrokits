'use client';
import { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loginViaProxy } from '@/lib/auth';

export default function AdminLoginPage(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const res=await loginViaProxy(email.trim(), password);
      // Verifica superadmin
      if(res.user?.role!=='superadmin' && res.user?.role!=='admin'){
        // Intenta validar via /api/admin/health
        const token=res.token;
        const h=await fetch('/api/admin/health',{ headers:{ Authorization:`Bearer ${token}`}, credentials:'include' }).then(r=>r.json()).catch(()=>({}));
        if(!h.superadmin && res.user?.role!=='superadmin'){
          setError('Este login es solo para SuperAdmin. Tu rol: '+ (res.user?.role||'desconocido'));
          setLoading(false);
          return;
        }
      }
      window.location.href='/admin';
    }catch(err){
      setError(err.message||'Credenciales inválidas');
    }finally{ setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg">
            <Shield className="w-7 h-7 text-white"/>
          </div>
          <h1 className="mt-4 text-2xl font-black text-white">SuperAdmin</h1>
          <p className="text-sm text-slate-400">Acceso exclusivo — gestión global de tenants</p>
          <p className="text-xs text-amber-400 mt-1">/admin/login aislado del login de empresas</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {error && <div className="flex gap-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3"><AlertCircle className="w-5 h-5 shrink-0"/><span>{error}</span></div>}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Email superadmin</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="superadmin@cobrokits.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-sm"/>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
              <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-sm"/>
              <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300">{show?<EyeOff className="w-5 h-5"/>:<Eye className="w-5 h-5"/>}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {loading?<Loader2 className="w-5 h-5 animate-spin"/>:<ArrowRight className="w-5 h-5"/>}{loading?'Ingresando...':'Entrar como SuperAdmin'}
          </button>
          <a href="/login" className="block text-center text-xs text-slate-500 hover:text-slate-300">← Login empresas / vendedores</a>
        </form>
      </div>
    </div>
  );
}
