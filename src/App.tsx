import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { Building2, Calculator, CreditCard, HandCoins, LayoutDashboard, LogOut, Menu, Package, Printer, Receipt, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { auth } from './firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { firestoreService } from './services/firestoreService';
import { previewReceipt } from './services/printService';
import { uploadTenantLogo } from './services/storageService';
import { Article, Client, Loan, ReceiptData, Tenant, TenantMembership, Transaction } from './types';

const ownerPermissions = { viewHistory: true, manageLoans: true, manageClients: true, manageInventory: true, manageCash: true, manageStaff: true, manageSettings: true };

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
}

function subscriptionAllowsWrites(tenant: Tenant) {
  if (!['trialing', 'active'].includes(tenant.subscription.status)) return false;
  return Date.parse(tenant.subscription.currentPeriodEnd) > Date.now();
}

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  return <div className="min-h-screen grid place-items-center bg-slate-950 p-5 text-slate-900">
    <div className="w-full max-w-md rounded-3xl bg-white p-9 shadow-2xl">
      <div className="mb-8 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl font-black text-white">P</div><div><h1 className="text-3xl font-black">PrestaPay</h1><p className="text-sm text-slate-500">Gestión segura para empresas de préstamos</p></div></div>
      <button onClick={onLogin} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700">Continuar con Google</button>
      <p className="mt-5 text-center text-xs text-slate-500">Cada empresa mantiene sus clientes, préstamos y caja completamente separados.</p>
    </div>
  </div>;
}

function Onboarding({ user, onCreated }: { user: User; onCreated: (tenant: Tenant, membership: TenantMembership) => void }) {
  const [name, setName] = useState(''); const [taxId, setTaxId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 14);
    const id = crypto.randomUUID();
    const tenant: Tenant = { id, slug: `${slugify(name)}-${id.slice(0, 6)}`, ownerId: user.uid, status: 'active',
      branding: { businessName: name.trim(), legalName: name.trim(), taxId: taxId.trim(), phone: '', email: user.email ?? '', address: '', logoUrl: '', primaryColor: '#4f46e5', accentColor: '#10b981', currency: 'DOP', locale: 'es-DO', notaryData: '' },
      printer: { paperWidth: 80, marginMm: 3, copies: 1, showLogo: true, footer: 'Gracias por su pago' },
      subscription: { status: 'trialing', planId: 'trial', currentPeriodStart: now.toISOString(), currentPeriodEnd: end.toISOString(), accessUntil: end, cancelAtPeriodEnd: false, provider: 'manual', updatedAt: now.toISOString() },
      createdAt: now.toISOString(), updatedAt: now.toISOString() };
    const membership: TenantMembership = { id, tenantId: id, userId: user.uid, email: user.email ?? '', displayName: user.displayName ?? '', role: 'owner', permissions: ownerPermissions, status: 'active', createdAt: now.toISOString() };
    try { await firestoreService.createTenant(tenant, membership); onCreated(tenant, membership); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la empresa.'); setBusy(false); }
  };
  return <div className="min-h-screen grid place-items-center bg-slate-100 p-5"><form onSubmit={create} className="w-full max-w-lg rounded-3xl bg-white p-9 shadow-xl">
    <Building2 className="mb-5 h-10 w-10 text-indigo-600"/><h1 className="text-3xl font-black">Crea tu empresa</h1><p className="mb-7 mt-2 text-slate-500">Incluye 14 días de prueba. Podrás configurar el resto después.</p>
    <label className="mb-2 block text-sm font-semibold">Nombre comercial</label><input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3" />
    <label className="mb-2 block text-sm font-semibold">RNC / identificación fiscal</label><input maxLength={30} value={taxId} onChange={e => setTaxId(e.target.value)} className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3" />
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Creando…' : 'Crear empresa'}</button>
  </form></div>;
}

function useTenantCollection<T>(tenantId: string, collectionName: string) {
  const [items, setItems] = useState<T[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { setLoading(true); const unsubscribe = firestoreService.subscribeToTenantCollection<T>(tenantId, collectionName, data => { setItems(data); setLoading(false); }); return unsubscribe; }, [tenantId, collectionName]);
  return { items, loading, error, setError };
}

const Empty = ({ title }: { title: string }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No hay {title.toLowerCase()} registrados todavía.</div>;
const Page = ({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) => <div className="p-5 md:p-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-900">{title}</h1><p className="mt-1 text-slate-500">{subtitle}</p></div>{action}</div>{children}</div>;

function Dashboard({ tenant }: { tenant: Tenant }) {
  const clients = useTenantCollection<Client>(tenant.id, 'clients'); const loans = useTenantCollection<Loan>(tenant.id, 'loans'); const articles = useTenantCollection<Article>(tenant.id, 'articles');
  const active = loans.items.filter(x => x.status !== 'pagado'); const capital = active.reduce((sum, x) => sum + Number(x.balance || 0), 0);
  const cards = [['Capital pendiente', `${tenant.branding.currency} ${capital.toLocaleString()}`], ['Préstamos activos', active.length], ['Clientes', clients.items.length], ['Artículos en resguardo', articles.items.filter(x => x.state === 'en_resguardo').length]];
  return <Page title="Dashboard" subtitle={`Resumen de ${tenant.branding.businessName}`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>)}</div></Page>;
}

function ClientsPage({ tenant, canWrite }: { tenant: Tenant; canWrite: boolean }) {
  const { items, loading } = useTenantCollection<Client>(tenant.id, 'clients');
  const add = async () => { const name = prompt('Nombre del cliente'); if (!name) return; const phone = prompt('Teléfono') ?? ''; const address = prompt('Dirección') ?? ''; await firestoreService.addTenantDocument(tenant.id, 'clients', { name, phone, address }); };
  return <Page title="Clientes" subtitle="Directorio aislado de esta empresa" action={<button disabled={!canWrite} onClick={add} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-40">+ Nuevo cliente</button>}>{loading ? <p>Cargando…</p> : items.length === 0 ? <Empty title="clientes"/> : <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Nombre</th><th>Teléfono</th><th>Dirección</th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-t"><td className="p-4 font-semibold">{x.name}</td><td>{x.phone}</td><td>{x.address}</td></tr>)}</tbody></table></div>}</Page>;
}

function LoansPage({ tenant }: { tenant: Tenant }) {
  const { items, loading } = useTenantCollection<Loan>(tenant.id, 'loans');
  return <Page title="Préstamos" subtitle="Contratos prendarios, personales e hipotecarios">{loading ? <p>Cargando…</p> : items.length === 0 ? <Empty title="préstamos"/> : <div className="grid gap-4">{items.map(x => <div key={x.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><strong>{x.clientName ?? x.clientId}</strong><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{x.status}</span></div><p className="mt-2 text-slate-500">{x.type} · Balance {tenant.branding.currency} {Number(x.balance).toLocaleString()}</p></div>)}</div>}</Page>;
}

function InventoryPage({ tenant }: { tenant: Tenant }) { const { items, loading } = useTenantCollection<Article>(tenant.id, 'articles'); return <Page title="Inventario" subtitle="Artículos vinculados a contratos">{loading ? <p>Cargando…</p> : items.length === 0 ? <Empty title="artículos"/> : <div className="grid gap-4 md:grid-cols-3">{items.map(x => <div key={x.id} className="rounded-2xl border bg-white p-5"><Package className="text-amber-500"/><strong className="mt-3 block">{x.name}</strong><p className="text-sm text-slate-500">{x.brand} · {x.state}</p></div>)}</div>}</Page>; }

function CashPage({ tenant }: { tenant: Tenant }) { const { items, loading } = useTenantCollection<Transaction>(tenant.id, 'transactions'); const balance = items.reduce((sum, x) => sum + (x.type === 'ingreso' ? Number(x.amount) : -Number(x.amount)), 0); return <Page title="Caja" subtitle="Ingresos, egresos y recibos"><div className="mb-5 rounded-2xl bg-slate-900 p-6 text-white"><p className="text-sm text-slate-300">Balance registrado</p><p className="mt-2 text-3xl font-black">{tenant.branding.currency} {balance.toLocaleString()}</p></div>{loading ? <p>Cargando…</p> : items.length === 0 ? <Empty title="movimientos"/> : items.map(x => <div key={x.id} className="mb-2 flex justify-between rounded-xl border bg-white p-4"><span>{x.description ?? x.type}</span><strong className={x.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}>{x.type === 'ingreso' ? '+' : '-'} {x.amount}</strong></div>)}</Page>; }

function Billing({ tenant }: { tenant: Tenant }) { const end = new Date(tenant.subscription.currentPeriodEnd); return <Page title="Suscripción" subtitle="Plan, renovación y estado de acceso"><div className="max-w-xl rounded-2xl border bg-white p-7"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Plan</p><p className="text-2xl font-black">{tenant.subscription.planId}</p></div><span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold uppercase text-indigo-700">{tenant.subscription.status}</span></div><hr className="my-6 border-slate-100"/><p>Válido hasta <strong>{end.toLocaleDateString(tenant.branding.locale)}</strong></p><p className="mt-3 text-sm text-slate-500">Las renovaciones deben procesarse en el backend mediante un proveedor de pago o por un Super Admin. El cliente no puede alterar su estado.</p></div></Page>; }

function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const api = async (path: string, init?: RequestInit) => { const token = await auth.currentUser?.getIdToken(); const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { ...init, headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } }); if (!response.ok) throw new Error(`API: ${response.status}`); return response.json(); };
  const load = async () => { setLoading(true); try { setTenants((await api('/v1/admin/tenants')).data); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const renew = async (item: Tenant) => { const start = new Date(); const end = new Date(); end.setMonth(end.getMonth() + 1); try { await api(`/v1/admin/tenants/${item.id}/subscription`, { method: 'PUT', body: JSON.stringify({ status: 'active', planId: item.subscription.planId || 'standard', currentPeriodStart: start.toISOString(), currentPeriodEnd: end.toISOString(), cancelAtPeriodEnd: false, provider: 'manual' }) }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo renovar.'); } };
  return <Page title="Super Admin" subtitle="Clientes SaaS y suscripciones">{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{loading ? <p>Cargando…</p> : <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Empresa</th><th>Estado</th><th>Vencimiento</th><th>Acción</th></tr></thead><tbody>{tenants.map(item => <tr key={item.id} className="border-t"><td className="p-4 font-bold">{item.branding.businessName}</td><td>{item.subscription.status}</td><td>{new Date(item.subscription.currentPeriodEnd).toLocaleDateString()}</td><td><button onClick={() => void renew(item)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white">Renovar 1 mes</button></td></tr>)}</tbody></table></div>}</Page>;
}

function StaffPage({ tenant, membership }: { tenant: Tenant; membership: TenantMembership }) {
  const [members, setMembers] = useState<TenantMembership[]>([]); const [message, setMessage] = useState('');
  const call = async (path: string, init?: RequestInit) => { const token = await auth.currentUser?.getIdToken(); const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { ...init, headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}`, 'x-tenant-id': tenant.id, ...(init?.headers ?? {}) } }); if (!response.ok) throw new Error(`API: ${response.status}`); return response.json(); };
  const load = async () => { try { setMembers((await call('/v1/members')).data); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo cargar.'); } };
  useEffect(() => { void load(); }, [tenant.id]);
  const add = async () => { const uid = prompt('UID del usuario en Firebase Authentication'); if (!uid) return; const email = prompt('Correo del usuario'); if (!email) return; const displayName = prompt('Nombre del usuario') || email; const role = prompt('Rol: admin, appraiser, cashier o viewer', 'cashier'); if (!role || !['admin','appraiser','cashier','viewer'].includes(role)) return setMessage('Rol inválido.'); const elevated = ['admin','appraiser'].includes(role); const permissions = { viewHistory: true, manageLoans: elevated, manageClients: role !== 'viewer', manageInventory: elevated, manageCash: ['admin','cashier'].includes(role), manageStaff: role === 'admin', manageSettings: role === 'admin' }; try { await call(`/v1/members/${encodeURIComponent(uid)}`, { method: 'PUT', body: JSON.stringify({ email, displayName, role, permissions, status: 'active' }) }); setMessage('Usuario guardado.'); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo guardar.'); } };
  return <Page title="Equipo y roles" subtitle="Acceso del personal a esta empresa" action={<button disabled={!membership.permissions.manageStaff} onClick={() => void add()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-40">+ Agregar usuario</button>}><p className="mb-4 text-sm text-slate-500">El usuario debe existir primero en Firebase Authentication. El API mantiene sincronizado su índice privado de membresías.</p>{message && <p className="mb-4 rounded-xl bg-indigo-50 p-3 text-indigo-800">{message}</p>}<div className="grid gap-3">{members.map(item => <div key={item.userId} className="flex items-center justify-between rounded-xl border bg-white p-4"><div><strong>{item.displayName}</strong><p className="text-sm text-slate-500">{item.email}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{item.role}</span></div>)}</div></Page>;
}

function SettingsPage({ user, tenant, membership, onUpdate }: { user: User; tenant: Tenant; membership: TenantMembership; onUpdate: (tenant: Tenant) => void }) {
  const [draft, setDraft] = useState(tenant); const [message, setMessage] = useState(''); const canEdit = membership.permissions.manageSettings;
  useEffect(() => setDraft(tenant), [tenant]);
  const save = async (event: FormEvent) => { event.preventDefault(); setMessage('Guardando…'); try { await firestoreService.updateTenant(tenant.id, { branding: draft.branding, printer: draft.printer }); onUpdate(draft); setMessage('Configuración guardada.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error al guardar.'); } };
  const logo = async (file?: File) => { if (!file) return; setMessage('Subiendo logo…'); try { const logoUrl = await uploadTenantLogo(tenant.id, user.uid, file); setDraft(x => ({ ...x, branding: { ...x.branding, logoUrl } })); setMessage('Logo listo; guarda los cambios.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo subir.'); } };
  const sample: ReceiptData = { number: 'PREVIEW-001', issuedAt: new Date().toISOString(), customerName: 'Cliente de ejemplo', description: 'Abono a préstamo', amount: 1500, balance: 4200 };
  return <Page title="Configuración" subtitle="Marca, datos comerciales e impresión térmica"><form onSubmit={save} className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-6"><h2 className="mb-5 text-xl font-bold">Identidad de la empresa</h2><div className="grid gap-4 sm:grid-cols-2">
    <Field label="Nombre comercial" value={draft.branding.businessName} onChange={v => setDraft(x => ({...x, branding:{...x.branding,businessName:v}}))}/><Field label="Razón social" value={draft.branding.legalName} onChange={v => setDraft(x => ({...x, branding:{...x.branding,legalName:v}}))}/><Field label="RNC / identificación fiscal" value={draft.branding.taxId} onChange={v => setDraft(x => ({...x, branding:{...x.branding,taxId:v}}))}/><Field label="Teléfono" value={draft.branding.phone} onChange={v => setDraft(x => ({...x, branding:{...x.branding,phone:v}}))}/><Field label="Correo" value={draft.branding.email} onChange={v => setDraft(x => ({...x, branding:{...x.branding,email:v}}))}/><Field label="Dirección" value={draft.branding.address} onChange={v => setDraft(x => ({...x, branding:{...x.branding,address:v}}))}/><Field label="Color principal" type="color" value={draft.branding.primaryColor} onChange={v => setDraft(x => ({...x, branding:{...x.branding,primaryColor:v}}))}/><label className="text-sm font-semibold">Logo (máx. 2 MB)<input disabled={!canEdit} type="file" accept="image/*" onChange={e => void logo(e.target.files?.[0])} className="mt-2 block w-full text-sm"/></label>
  </div></section><section className="rounded-2xl border bg-white p-6"><h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><Printer/> Impresión térmica</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Ancho<select value={draft.printer.paperWidth} onChange={e => setDraft(x => ({...x,printer:{...x.printer,paperWidth:Number(e.target.value) as 58|80}}))} className="mt-2 block w-full rounded-xl border p-3"><option value="58">58 mm</option><option value="80">80 mm</option></select></label><Field label="Margen (mm)" type="number" value={String(draft.printer.marginMm)} onChange={v => setDraft(x => ({...x,printer:{...x.printer,marginMm:Math.min(10, Math.max(0, Number(v)))}}))}/><Field label="Copias" type="number" value={String(draft.printer.copies)} onChange={v => setDraft(x => ({...x,printer:{...x.printer,copies:Math.min(5, Math.max(1, Number(v)))}}))}/><Field label="Pie del recibo" value={draft.printer.footer} onChange={v => setDraft(x => ({...x,printer:{...x.printer,footer:v}}))}/></div><button type="button" onClick={() => previewReceipt(draft.branding, draft.printer, sample)} className="mt-5 rounded-xl border border-indigo-200 px-4 py-2 font-bold text-indigo-700">Vista previa / imprimir</button><p className="mt-3 text-xs text-slate-500">En web, la selección física de impresora la controla el diálogo del sistema. Android incluye selección Bluetooth ESC/POS.</p></section>
  <div className="xl:col-span-2 flex items-center gap-4"><button disabled={!canEdit} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-40">Guardar cambios</button><span className="text-sm text-slate-600">{message}</span></div></form></Page>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-sm font-semibold">{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-2 block h-11 w-full rounded-xl border border-slate-200 px-3"/></label>; }

function SubscriptionGate({ tenant }: { tenant: Tenant }) { return <div className="mx-5 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"><div><strong>Acceso operativo bloqueado</strong><p className="text-sm">La suscripción está {tenant.subscription.status} o vencida. Los datos permanecen disponibles en modo seguro.</p></div><Link className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white" to="/suscripcion">Revisar suscripción</Link></div>; }

function Layout({ user, tenant, membership, superAdmin, onTenantUpdate }: { user: User; tenant: Tenant; membership: TenantMembership; superAdmin: boolean; onTenantUpdate: (tenant: Tenant) => void }) {
  const [open, setOpen] = useState(false); const location = useLocation(); const canWrite = subscriptionAllowsWrites(tenant);
  const menu = ([['/', LayoutDashboard, 'Dashboard'], ['/clientes', Users, 'Clientes'], ['/prestamos', HandCoins, 'Préstamos'], ['/inventario', Package, 'Inventario'], ['/caja', Calculator, 'Caja'], ...(membership.permissions.manageStaff ? [['/equipo', Users, 'Equipo']] : []), ['/suscripcion', CreditCard, 'Suscripción'], ['/configuracion', Settings, 'Configuración'], ...(superAdmin ? [['/super-admin', ShieldCheck, 'Super Admin']] : [])] as [string, typeof LayoutDashboard, string][]);
  return <div className="min-h-screen bg-slate-100"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:hidden"><button onClick={() => setOpen(true)}><Menu/></button><strong>{tenant.branding.businessName}</strong></header><aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-white transition md:translate-x-0`}><div className="flex h-20 items-center justify-between border-b px-5"><div className="flex items-center gap-3">{tenant.branding.logoUrl ? <img src={tenant.branding.logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain"/> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">P</div>}<div><strong className="block max-w-40 truncate">{tenant.branding.businessName}</strong><span className="text-xs text-slate-500">{membership.role}</span></div></div><button className="md:hidden" onClick={() => setOpen(false)}><X/></button></div><nav className="flex-1 space-y-1 overflow-y-auto p-4">{menu.map(([path, Icon, label]) => <Link onClick={() => setOpen(false)} key={path} to={path} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold ${location.pathname === path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={20}/>{label}</Link>)}</nav><div className="border-t p-4"><p className="truncate text-sm font-semibold">{user.displayName ?? user.email}</p><button onClick={() => void signOut(auth)} className="mt-3 flex items-center gap-2 text-sm font-bold text-red-600"><LogOut size={17}/> Cerrar sesión</button></div></aside><main className="md:pl-72">{!canWrite && <SubscriptionGate tenant={tenant}/>}<Routes><Route path="/" element={<Dashboard tenant={tenant}/>}/><Route path="/clientes" element={<ClientsPage tenant={tenant} canWrite={canWrite && membership.permissions.manageClients}/>}/><Route path="/prestamos" element={<LoansPage tenant={tenant}/>}/><Route path="/inventario" element={<InventoryPage tenant={tenant}/>}/><Route path="/caja" element={<CashPage tenant={tenant}/>}/>{membership.permissions.manageStaff && <Route path="/equipo" element={<StaffPage tenant={tenant} membership={membership}/>}/>}<Route path="/suscripcion" element={<Billing tenant={tenant}/>}/><Route path="/configuracion" element={<SettingsPage user={user} tenant={tenant} membership={membership} onUpdate={onTenantUpdate}/>}/>{superAdmin && <Route path="/super-admin" element={<SuperAdminPage/>}/>}<Route path="*" element={<Navigate to="/" replace/>}/></Routes></main>{open && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)}/>}</div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [memberships, setMemberships] = useState<TenantMembership[]>([]); const [tenant, setTenant] = useState<Tenant | null>(null); const [superAdmin, setSuperAdmin] = useState(false); const [error, setError] = useState('');
  const membership = useMemo(() => memberships.find(item => item.tenantId === tenant?.id) ?? null, [memberships, tenant]);
  useEffect(() => onAuthStateChanged(auth, async current => { setUser(current); setError(''); if (!current) { setMemberships([]); setTenant(null); setSuperAdmin(false); setLoading(false); return; } try { setSuperAdmin((await current.getIdTokenResult()).claims.superAdmin === true); const mine = await firestoreService.listMemberships(current.uid); setMemberships(mine.filter(x => x.status === 'active')); const selected = mine.find(x => x.status === 'active'); if (selected) setTenant(await firestoreService.getTenant(selected.tenantId)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la cuenta.'); } finally { setLoading(false); } }), []);
  const login = async () => { setError(''); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); } };
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><p className="animate-pulse font-bold">Cargando PrestaPay…</p></div>;
  if (!user) return <><Login onLogin={login}/>{error && <p className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-white">{error}</p>}</>;
  if (!tenant || !membership) return <Onboarding user={user} onCreated={(created, member) => { setTenant(created); setMemberships([member]); }}/>;
  return <BrowserRouter><ErrorBoundary><Layout user={user} tenant={tenant} membership={membership} superAdmin={superAdmin} onTenantUpdate={setTenant}/></ErrorBoundary></BrowserRouter>;
}
