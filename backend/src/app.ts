import './types.js';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ZodError, type ZodType } from 'zod';
import { adminAuth, adminDb } from './firebase.js';
import { authenticate, isSuperAdmin, requireActiveSubscription, requireRole, requireSuperAdmin, requireTenant } from './middleware.js';
import { articleSchema, clientSchema, loanSchema, membershipSchema, subscriptionSchema, tenantCreateSchema, transactionSchema } from './schemas.js';
import { hasSubscriptionAccess } from './subscription.js';
import { calculatePaymentBalance } from './payments.js';
import { addPaymentPeriod, asDate, isPastDue, type PaymentFrequency } from './loans.js';

export const app = express();
function jsonValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]));
  return value;
}
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'wss://*.firebaseio.com'],
  imgSrc: ["'self'", 'data:', 'https:'], frameSrc: ["'self'", 'https://accounts.google.com', 'https://prestamo-27ccb.firebaseapp.com'], objectSrc: ["'none'"],
} } }));
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','), credentials: false }));
app.use(express.json({ limit: '256kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/v1', authenticate);
app.get('/v1/me', async (req, res) => {
  const memberships = await adminDb.collection(`users/${req.identity!.uid}/memberships`).get();
  res.json({ user: { uid: req.identity!.uid, email: req.identity!.email, superAdmin: isSuperAdmin(req.identity) }, memberships: memberships.docs.map(x => ({ id: x.id, ...x.data() })) });
});

app.post('/v1/tenants', async (req, res) => {
  const value = tenantCreateSchema.parse(req.body); const uid = req.identity!.uid; const id = adminDb.collection('tenants').doc().id;
  const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 14);
  const permissions = { viewHistory: true, manageLoans: true, manageClients: true, manageInventory: true, manageCash: true, manageStaff: true, manageSettings: true };
  const membership = { tenantId: id, userId: uid, email: req.identity!.email ?? '', displayName: req.identity!.name ?? value.businessName, role: 'owner', permissions, status: 'active', createdAt: now.toISOString() };
  const tenant = { id, slug: `${value.businessName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)}-${id.slice(0, 6)}`, ownerId: uid, status: 'active',
    branding: { businessName: value.businessName, legalName: value.legalName || value.businessName, taxId: value.taxId || '', phone: value.phone || '', email: req.identity!.email ?? '', address: value.address || '', logoUrl: '', primaryColor: '#4f46e5', accentColor: '#10b981', currency: 'DOP', locale: 'es-DO', notaryData: '' },
    printer: { paperWidth: 80, marginMm: 3, copies: 1, showLogo: true, footer: 'Gracias por su pago' },
    subscription: { status: 'trialing', planId: 'trial', currentPeriodStart: now.toISOString(), currentPeriodEnd: end.toISOString(), accessUntil: Timestamp.fromDate(end), cancelAtPeriodEnd: false, provider: 'manual', updatedAt: now.toISOString() }, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  const batch = adminDb.batch(); batch.create(adminDb.doc(`tenants/${id}`), tenant); batch.create(adminDb.doc(`tenants/${id}/members/${uid}`), membership); batch.set(adminDb.doc(`users/${uid}/memberships/${id}`), membership); batch.set(adminDb.doc(`users/${uid}`), { uid, email: req.identity!.email ?? '', displayName: req.identity!.name ?? '', activeTenantId: id, createdAt: now.toISOString(), updatedAt: now.toISOString() }, { merge: true }); await batch.commit();
  res.status(201).json({ tenant, membership });
});

app.get('/v1/tenant', requireTenant, async (req, res) => {
  const tenant = req.tenant!.data; const subscription = tenant.subscription ?? {};
  res.json({ tenant: { id: req.tenant!.id, ...tenant, subscription: { ...subscription, accessAllowed: hasSubscriptionAccess(subscription) } }, membership: req.tenant!.membership });
});

app.get('/v1/summary', requireTenant, async (req, res) => {
  const root = adminDb.collection(`tenants/${req.tenant!.id}`);
  const [clients, loans, articles] = await Promise.all([root.doc('meta').get().catch(() => null), adminDb.collection(`${root.path}/loans`).where('status', 'in', ['activo','atrasado','vencido']).get(), adminDb.collection(`${root.path}/articles`).where('state', '==', 'en_resguardo').get()]);
  const clientCount = clients?.get('clientCount') ?? (await adminDb.collection(`${root.path}/clients`).count().get()).data().count;
  const overdueLoans = loans.docs.filter(x => ['atrasado','vencido'].includes(String(x.get('status'))) || isPastDue(x.get('nextPaymentDate') || x.get('dueDate'))).length;
  const activeClientIds = new Set(loans.docs.map(x => String(x.get('clientId'))).filter(Boolean));
  res.json({ clients: clientCount, activeClients: activeClientIds.size, activeLoans: loans.size, onTimeLoans: loans.size - overdueLoans, overdueLoans, capitalInvested: loans.docs.reduce((sum, x) => sum + Number(x.get('capital') || 0), 0), heldArticles: articles.size, outstandingBalance: loans.docs.reduce((sum, x) => sum + Number(x.get('balance') || 0), 0) });
});

type Resource = 'clients' | 'articles' | 'loans';
const schemas: Record<Resource, ZodType> = { clients: clientSchema, articles: articleSchema, loans: loanSchema };
const writeRoles: Record<Resource, string[]> = { clients: ['owner','admin','appraiser','cashier'], articles: ['owner','admin','appraiser'], loans: ['owner','admin','appraiser'] };

for (const resource of Object.keys(schemas) as Resource[]) {
  app.get(`/v1/${resource}`, requireTenant, async (req, res) => {
    const snapshot = await adminDb.collection(`tenants/${req.tenant!.id}/${resource}`).orderBy('createdAt', 'desc').limit(250).get();
    res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...(jsonValue(x.data()) as Record<string, unknown>) })) });
  });
  app.post(`/v1/${resource}`, requireTenant, requireActiveSubscription, requireRole(...writeRoles[resource]), async (req, res) => {
    const data = schemas[resource].parse(req.body) as Record<string, unknown>; const tenantId = req.tenant!.id; const now = FieldValue.serverTimestamp();
    const record = adminDb.collection(`tenants/${tenantId}/${resource}`).doc();
    const generated = resource === 'loans' && !data.contractNumber ? { contractNumber: `PRE-${record.id.slice(0,8).toUpperCase()}` } : {};
    await record.create({ ...data, ...generated, tenantId, createdAt: now, updatedAt: now, createdBy: req.identity!.uid });
    await adminDb.collection(`tenants/${tenantId}/auditLogs`).add({ tenantId, action: `${resource}.create`, entityId: record.id, actorId: req.identity!.uid, createdAt: now });
    res.status(201).json({ id: record.id });
  });
}

app.get('/v1/transactions', requireTenant, async (req, res) => {
  const snapshot = await adminDb.collection(`tenants/${req.tenant!.id}/transactions`).orderBy('createdAt', 'desc').limit(250).get();
  res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...x.data() })) });
});
app.post('/v1/transactions', requireTenant, requireActiveSubscription, requireRole('owner','admin','cashier'), async (req, res) => {
  const value = transactionSchema.parse(req.body); const tenantId = req.tenant!.id; const transactionRef = adminDb.collection(`tenants/${tenantId}/transactions`).doc(); const receiptRef = adminDb.collection(`tenants/${tenantId}/receipts`).doc();
  let previousBalance = 0; let newBalance = 0;
  await adminDb.runTransaction(async transaction => {
    if (value.contractId && value.type === 'ingreso') {
      const loanRef = adminDb.doc(`tenants/${tenantId}/loans/${value.contractId}`); const loan = await transaction.get(loanRef);
      if (!loan.exists) throw Object.assign(new Error('loan_not_found'), { statusCode: 404 });
      previousBalance = Number(loan.get('balance') || 0); newBalance = calculatePaymentBalance(previousBalance, value.amount);
      const installmentAmount = Number(loan.get('installmentAmount') || 0); const currentPaymentDate = asDate(loan.get('nextPaymentDate'));
      const paymentFrequency = String(loan.get('paymentFrequency') || 'mensual') as PaymentFrequency;
      const nextPaymentDate = newBalance > 0 && installmentAmount > 0 && value.amount >= installmentAmount && currentPaymentDate ? addPaymentPeriod(currentPaymentDate, paymentFrequency).toISOString() : loan.get('nextPaymentDate');
      transaction.update(loanRef, { balance: newBalance, status: newBalance === 0 ? 'pagado' : 'activo', nextPaymentDate, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.identity!.uid });
    }
    transaction.create(transactionRef, { ...value, tenantId, previousBalance, newBalance, createdAt: FieldValue.serverTimestamp(), createdBy: req.identity!.uid });
    transaction.create(receiptRef, { tenantId, transactionId: transactionRef.id, number: `REC-${Date.now().toString(36).toUpperCase()}`, amount: value.amount, description: value.description, contractId: value.contractId ?? null, createdAt: FieldValue.serverTimestamp(), createdBy: req.identity!.uid });
  });
  res.status(201).json({ id: transactionRef.id, receiptId: receiptRef.id, previousBalance, newBalance });
});

app.patch('/v1/clients/:id', requireTenant, requireActiveSubscription, requireRole('owner','admin','appraiser','cashier'), async (req, res) => {
  const data = clientSchema.partial().parse(req.body); const ref = adminDb.doc(`tenants/${req.tenant!.id}/clients/${req.params.id}`);
  if (!(await ref.get()).exists) return res.status(404).json({ error: 'not_found' });
  await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.identity!.uid }); return res.status(204).send();
});
app.patch('/v1/articles/:id', requireTenant, requireActiveSubscription, requireRole('owner','admin','appraiser'), async (req, res) => {
  const data = articleSchema.partial().parse(req.body); const ref = adminDb.doc(`tenants/${req.tenant!.id}/articles/${req.params.id}`); if (!(await ref.get()).exists) return res.status(404).json({ error: 'not_found' }); await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.identity!.uid }); return res.status(204).send();
});
app.patch('/v1/loans/:id', requireTenant, requireActiveSubscription, requireRole('owner','admin','appraiser'), async (req, res) => {
  const data = loanSchema.partial().parse(req.body); const ref = adminDb.doc(`tenants/${req.tenant!.id}/loans/${req.params.id}`); if (!(await ref.get()).exists) return res.status(404).json({ error: 'not_found' }); await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.identity!.uid }); return res.status(204).send();
});

app.get('/v1/members', requireTenant, requireRole('owner','admin'), async (req, res) => {
  const snapshot = await adminDb.collection(`tenants/${req.tenant!.id}/members`).orderBy('createdAt').get();
  res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...x.data() })) });
});
app.put('/v1/members/:uid', requireTenant, requireActiveSubscription, requireRole('owner','admin'), async (req, res) => {
  const value = membershipSchema.parse(req.body); const tenantId = req.tenant!.id; const uid = String(req.params.uid);
  const existing = await adminDb.doc(`tenants/${tenantId}/members/${uid}`).get();
  if (existing.exists && existing.get('role') === 'owner') return res.status(409).json({ error: 'owner_membership_is_immutable' });
  const membership = { ...value, tenantId, userId: uid, createdAt: (existing.exists ? existing.get('createdAt') : undefined) ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
  const batch = adminDb.batch();
  batch.set(adminDb.doc(`tenants/${tenantId}/members/${uid}`), membership, { merge: true });
  batch.set(adminDb.doc(`users/${uid}/memberships/${tenantId}`), membership, { merge: true });
  batch.set(adminDb.collection(`tenants/${tenantId}/auditLogs`).doc(), { tenantId, action: 'membership.upsert', entityId: uid, actorId: req.identity!.uid, role: value.role, status: value.status, createdAt: FieldValue.serverTimestamp() });
  await batch.commit(); return res.json({ data: membership });
});
app.post('/v1/members/by-email', requireTenant, requireActiveSubscription, requireRole('owner','admin'), async (req, res) => {
  const value = membershipSchema.parse(req.body); const account = await adminAuth.getUserByEmail(value.email); const tenantId = req.tenant!.id; const existing = await adminDb.doc(`tenants/${tenantId}/members/${account.uid}`).get(); if (existing.exists && existing.get('role') === 'owner') return res.status(409).json({ error: 'owner_membership_is_immutable' }); const membership = { ...value, tenantId, userId: account.uid, createdAt: (existing.exists ? existing.get('createdAt') : undefined) ?? new Date().toISOString(), updatedAt: new Date().toISOString() }; const batch = adminDb.batch(); batch.set(adminDb.doc(`tenants/${tenantId}/members/${account.uid}`), membership, { merge: true }); batch.set(adminDb.doc(`users/${account.uid}/memberships/${tenantId}`), membership, { merge: true }); batch.set(adminDb.collection(`tenants/${tenantId}/auditLogs`).doc(), { tenantId, action: 'membership.upsert', entityId: account.uid, actorId: req.identity!.uid, role: value.role, status: value.status, createdAt: FieldValue.serverTimestamp() }); await batch.commit(); res.json({ data: membership });
});

app.get('/v1/admin/tenants', requireSuperAdmin, async (_req, res) => {
  const snapshot = await adminDb.collection('tenants').orderBy('createdAt', 'desc').limit(250).get();
  res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...x.data() })) });
});
app.put('/v1/admin/tenants/:tenantId/subscription', requireSuperAdmin, async (req, res) => {
  const value = subscriptionSchema.parse(req.body);
  const subscription = { ...value, accessUntil: Timestamp.fromDate(new Date(value.currentPeriodEnd)), updatedAt: new Date().toISOString() };
  await adminDb.doc(`tenants/${req.params.tenantId}`).update({ subscription, updatedAt: FieldValue.serverTimestamp() });
  await adminDb.collection(`tenants/${req.params.tenantId}/auditLogs`).add({ tenantId: req.params.tenantId, action: 'subscription.update', actorId: req.identity!.uid, createdAt: FieldValue.serverTimestamp(), subscription });
  res.json({ subscription });
});

app.post('/v1/ai/item-description', requireTenant, requireActiveSubscription, requireRole('owner','admin','appraiser'), async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'ai_not_configured' });
  const item = articleSchema.pick({ name: true, category: true, brand: true, state: true }).parse(req.body);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Escribe una descripción breve y profesional en español para: ${JSON.stringify(item)}` }] }] }) });
  if (!response.ok) return res.status(502).json({ error: 'ai_provider_error' });
  const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  res.json({ description: result.candidates?.[0]?.content?.parts?.[0]?.text ?? '' });
});

app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
  if (error instanceof ZodError) return res.status(422).json({ error: 'validation_failed', details: error.issues });
  if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number') return res.status(error.statusCode).json({ error: error.message });
  console.error(error); return res.status(500).json({ error: 'internal_error' });
});
