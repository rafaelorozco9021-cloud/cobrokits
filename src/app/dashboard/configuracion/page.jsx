'use client';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';
import { ChevronDown, ChevronUp, Phone, Package, Users, Plus, X } from 'lucide-react';

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h3 className="font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  const [open, setOpen] = useState('vendedores');
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState({ sellers: true, products: true, customers: true, cobros: true });
  const [modal, setModal] = useState(null); // 'vendedor' | 'producto' | 'cliente'
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Forms
  const [fSeller, setFSeller] = useState({ name: '', email: '', phone: '' });
  const [fProduct, setFProduct] = useState({ name: '', description: '', cost_price: '', price: '', category: 'embutidos', stock: '' });
  const [fCustomer, setFCustomer] = useState({ name: '', phone: '', email: '', address: '', cobro_id: '' });

  const onlySellers = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    // Si el backend ya filtra, esto no quita nada. Si llega superadmin/empresa, los saca.
    return list.filter((s) => {
      const role = (s?.role || '').toString().toLowerCase();
      if (role) return role === 'seller' || role === 'vendedor';
      const n = (s?.name || '').toLowerCase();
      const e = (s?.email || '').toLowerCase();
      if (n.includes('super') || n === 'admin' || n.includes('blacksoft') || e.includes('admin')) return false;
      return true;
    });
  };

  const loadSellers = async () => {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Fuente principal: /api/sellers (ya filtra role='seller' en backend)
      const r2 = await fetch('/api/sellers', { credentials: 'include', headers }).then((r) => r.json().catch(() => []));
      const sellersOnly = onlySellers(r2);
      if (sellersOnly.length > 0 || (Array.isArray(r2) && r2.length === 0)) {
        setSellers(sellersOnly);
      } else {
        const res = await fetch('/api/auth', { credentials: 'include', headers });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (list.length === 0 || list[0]?.stub) {
          setSellers(sellersOnly);
        } else setSellers(onlySellers(list));
      }
    } catch {}
    setLoading((v) => ({ ...v, sellers: false }));
  };
  const loadProducts = async () => {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch('/api/products', { credentials: 'include', headers });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data?.data || []);
    } catch {}
    setLoading((v) => ({ ...v, products: false }));
  };
  const loadCustomers = async () => {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch('/api/customers', { credentials: 'include', headers });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {}
    setLoading((v) => ({ ...v, customers: false }));
  };
  const loadCobros = async () => {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch('/api/cobros', { credentials: 'include', headers });
      const data = await res.json();
      setCobros(Array.isArray(data) ? data : []);
    } catch {}
    setLoading((v) => ({ ...v, cobros: false }));
  };
  const cobroName = (id) => cobros.find((c) => c.id === id)?.name || '—';

  useEffect(() => {
    loadSellers();
    loadProducts();
    loadCustomers();
    loadCobros();
  }, []);

  useEffect(() => {
    if (cobros.length > 0 && !fCustomer.cobro_id) setFCustomer((v) => ({ ...v, cobro_id: cobros[0].id }));
  }, [cobros, fCustomer.cobro_id]);

  const toggle = (section) => setOpen(open === section ? null : section);

  async function handleAddSeller(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/sellers', { method: 'POST', credentials: 'include', headers, body: JSON.stringify(fSeller) });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg('Vendedor creado');
      setFSeller({ name: '', email: '', phone: '' });
      setModal(null);
      loadSellers();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const payload = {
        name: fProduct.name,
        description: fProduct.description,
        cost_price: Number(fProduct.cost_price || 0),
        price: Number(fProduct.price || 0),
        category: fProduct.category,
        stock: Number(fProduct.stock || 0),
      };
      const res = await fetch('/api/products', { method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg('Producto creado');
      setFProduct({ name: '', description: '', cost_price: '', price: '', category: 'embutidos', stock: '' });
      setModal(null);
      loadProducts();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!fCustomer.cobro_id) {
      setErr('Selecciona el cobro al que pertenece el cliente.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      // El cliente pertenece a un cobro; el backend deriva el vendedor del cobro.
      const payload = { name: fCustomer.name, phone: fCustomer.phone, email: fCustomer.email, address: fCustomer.address, cobro_id: fCustomer.cobro_id };
      const res = await fetch('/api/customers', { method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
      setMsg('Cliente creado');
      setFCustomer({ name: '', phone: '', email: '', address: '', cobro_id: cobros[0]?.id || '' });
      setModal(null);
      loadCustomers();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const Section = ({ id, title, count, icon: Icon, children }) => {
    const isOpen = open === id;
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOpen ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              {title} <span className="font-normal text-slate-500">({count})</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOpen ? 'bg-blue-100 text-[#2563eb]' : 'bg-slate-100 text-slate-600'}`}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>
        {isOpen && <div className="border-t border-slate-200 p-4 bg-white">{children}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Configuración de Sistema</h1>
        <p className="text-xs text-slate-500">Haz clic en una sección para ver su información. Solo una se muestra a la vez.</p>
        {(msg || err) && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold ${err ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
            {err || msg}
          </div>
        )}
      </div>

      <Section id="vendedores" title="Vendedor" count={sellers.length} icon={Phone}>
        <div className="flex justify-end mb-3">
          <button onClick={() => { setErr(''); setMsg(''); setModal('vendedor'); }} className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {loading.sellers ? (
          <p className="text-center text-xs text-slate-400 py-6">Cargando vendedores...</p>
        ) : sellers.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No hay vendedores.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 text-[#2563eb] text-[11px] font-bold">
                  <th className="px-3 py-2 text-left">NOMBRE</th>
                  <th className="px-3 py-2 text-center">TELÉFONO</th>
                  <th className="px-3 py-2 text-center">EMAIL</th>
                  <th className="px-3 py-2 text-center">ESTADO</th>
                  <th className="px-3 py-2 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-700">{s.phone || '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-600 truncate max-w-[160px]">{s.email || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-400">✎ 🗑</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="productos" title="Producto" count={products.length} icon={Package}>
        <div className="flex justify-end mb-3">
          <button onClick={() => { setErr(''); setMsg(''); setModal('producto'); }} className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {loading.products ? (
          <p className="text-center text-xs text-slate-400 py-6">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No hay productos activos aún.</p>
        ) : (
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-blue-50">
                <tr className="text-[#2563eb] text-[11px] font-bold">
                  <th className="px-3 py-2 text-left">PRODUCTO</th>
                  <th className="px-2 py-2 text-center">SKU</th>
                  <th className="px-2 py-2 text-right">COSTO</th>
                  <th className="px-2 py-2 text-right">PVP</th>
                  <th className="px-2 py-2 text-center">CATEGORÍA</th>
                  <th className="px-2 py-2 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[240px]">{p.description || 'Sin descripción'}</p>
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600">{p.sku || p.id.slice(0, 6)}</td>
                    <td className="px-2 py-2 text-right font-bold text-slate-700">$ {Number(p.cost_price || p.cost || 0).toLocaleString('es-CO')}</td>
                    <td className="px-2 py-2 text-right font-black text-slate-900">$ {Number(p.price || 0).toLocaleString('es-CO')}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">{p.category || 'general'}</span>
                    </td>
                    <td className="px-2 py-2 text-center text-slate-400">✎ 🗑</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="clientes" title="Cliente" count={customers.length} icon={Users}>
        <div className="flex justify-end mb-3">
          <button onClick={() => { setErr(''); setMsg(''); setModal('cliente'); }} className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {loading.customers ? (
          <p className="text-center text-xs text-slate-400 py-6">Cargando clientes...</p>
        ) : customers.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No hay clientes.</p>
        ) : (
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-blue-50">
                <tr className="text-[#2563eb] text-[11px] font-bold">
                  <th className="px-3 py-2 text-left">NOMBRE</th>
                  <th className="px-2 py-2 text-center">TELÉFONO</th>
                  <th className="px-2 py-2 text-left">DIRECCIÓN</th>
                  <th className="px-2 py-2 text-center">COBRO</th>
                  <th className="px-2 py-2 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-900">{c.name}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-700">{c.phone || '—'}</td>
                    <td className="px-2 py-2 text-slate-600 truncate max-w-[200px]">{c.address || '—'}</td>
                    <td className="px-2 py-2 text-center text-slate-600">{c.cobro_id ? cobroName(c.cobro_id) : '—'}</td>
                    <td className="px-2 py-2 text-center text-slate-400">✎ 🗑</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {modal === 'vendedor' && (
        <Modal title="Agregar Vendedor" onClose={() => setModal(null)}>
          <form onSubmit={handleAddSeller} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Nombre *</label>
              <input required value={fSeller.name} onChange={(e) => setFSeller({ ...fSeller, name: e.target.value })} placeholder="Ej: Carlos Ruiz" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email *</label>
              <input required type="email" value={fSeller.email} onChange={(e) => setFSeller({ ...fSeller, email: e.target.value })} placeholder="carlos@cobrokits.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Teléfono</label>
              <input value={fSeller.phone} onChange={(e) => setFSeller({ ...fSeller, phone: e.target.value })} placeholder="3001234567" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'producto' && (
        <Modal title="Agregar Producto" onClose={() => setModal(null)}>
          <form onSubmit={handleAddProduct} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Nombre *</label>
              <input required value={fProduct.name} onChange={(e) => setFProduct({ ...fProduct, name: e.target.value })} placeholder="Ej: Salchichón Premium 1kg" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Descripción</label>
              <input value={fProduct.description} onChange={(e) => setFProduct({ ...fProduct, description: e.target.value })} placeholder="Descripción breve" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Costo *</label>
                <input required type="number" value={fProduct.cost_price} onChange={(e) => setFProduct({ ...fProduct, cost_price: e.target.value })} placeholder="12000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">PVP *</label>
                <input required type="number" value={fProduct.price} onChange={(e) => setFProduct({ ...fProduct, price: e.target.value })} placeholder="18000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Categoría</label>
                <select value={fProduct.category} onChange={(e) => setFProduct({ ...fProduct, category: e.target.value })} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 mt-1">
                  <option value="embutidos">embutidos</option>
                  <option value="lacteos">lacteos</option>
                  <option value="frutos secos">frutos secos</option>
                  <option value="general">general</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Stock inicial</label>
                <input type="number" value={fProduct.stock} onChange={(e) => setFProduct({ ...fProduct, stock: e.target.value })} placeholder="10" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
            </div>
            {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'cliente' && (
        <Modal title="Agregar Cliente" onClose={() => setModal(null)}>
          <form onSubmit={handleAddCustomer} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Nombre *</label>
              <input required value={fCustomer.name} onChange={(e) => setFCustomer({ ...fCustomer, name: e.target.value })} placeholder="Ej: Tienda La Esperanza" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Teléfono</label>
                <input value={fCustomer.phone} onChange={(e) => setFCustomer({ ...fCustomer, phone: e.target.value })} placeholder="3101234567" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Email</label>
                <input type="email" value={fCustomer.email} onChange={(e) => setFCustomer({ ...fCustomer, email: e.target.value })} placeholder="cliente@test.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Dirección</label>
              <input value={fCustomer.address} onChange={(e) => setFCustomer({ ...fCustomer, address: e.target.value })} placeholder="Calle 1 # 2-3 Barrio" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Cobro asignado *</label>
              {cobros.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">No hay cobros. Crea primero un cobro en “Config de Cobros”.</p>
              ) : (
                <select required value={fCustomer.cobro_id} onChange={(e) => setFCustomer({ ...fCustomer, cobro_id: e.target.value })} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 mt-1">
                  {cobros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.dia_nombre || c.grupo ? ` — ${c.dia_nombre || ''} ${c.grupo || ''}`.trim() : ''}{c.seller_name ? ` (${c.seller_name})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
