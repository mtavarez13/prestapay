import './types.js';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ZodError, type ZodType } from 'zod';
import { adminDb } from './firebase.js';
import { authenticate, requireActiveSubscription, requireRole, requireSuperAdmin, requireTenant } from './middleware.js';
import { articleSchema, clientSchema, loanSchema, membershipSchema, subscriptionSchema, transactionSchema } from './schemas.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','), credentials: false }));
app.use(express.json({ limit: '256kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/v1', authenticate);
app.get('/v1/me', async (req, res) => {
  const memberships = await adminDb.collection(`users/${req.identity!.uid}/memberships`).get();
  res.json({ user: { uid: req.identity!.uid, email: req.identity!.email, superAdmin: req.identity!.superAdmin === true }, memberships: memberships.docs.map(x => ({ id: x.id, ...x.data() })) });
});

app.get('/v1/summary', requireTenant, async (req, res) => {
  const root = adminDb.collection(`tenants/${req.tenant!.id}`);
  const [clients, loans, articles] = await Promise.all([root.doc('meta').get().catch(() => null), adminDb.collection(`${root.path}/loans`).where('status', 'in', ['activo','atrasado','vencido']).get(), adminDb.collection(`${root.path}/articles`).where('state', '==', 'en_resguardo').get()]);
  const clientCount = clients?.get('clientCount') ?? (await adminDb.collection(`${root.path}/clients`).count().get()).data().count;
  res.json({ clients: clientCount, activeLoans: loans.size, heldArticles: articles.size, outstandingBalance: loans.docs.reduce((sum, x) => sum + Number(x.get('balance') || 0), 0) });
});

type Resource = 'clients' | 'articles' | 'loans' | 'transactions';
const schemas: Record<Resource, ZodType> = { clients: clientSchema, articles: articleSchema, loans: loanSchema, transactions: transactionSchema };
const writeRoles: Record<Resource, string[]> = { clients: ['owner','admin','appraiser','cashier'], articles: ['owner','admin','appraiser'], loans: ['owner','admin','appraiser'], transactions: ['owner','admin','cashier'] };

for (const resource of Object.keys(schemas) as Resource[]) {
  app.get(`/v1/${resource}`, requireTenant, async (req, res) => {
    const snapshot = await adminDb.collection(`tenants/${req.tenant!.id}/${resource}`).orderBy('createdAt', 'desc').limit(250).get();
    res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...x.data() })) });
  });
  app.post(`/v1/${resource}`, requireTenant, requireActiveSubscription, requireRole(...writeRoles[resource]), async (req, res) => {
    const data = schemas[resource].parse(req.body) as Record<string, unknown>; const tenantId = req.tenant!.id; const now = FieldValue.serverTimestamp();
    const record = await adminDb.collection(`tenants/${tenantId}/${resource}`).add({ ...data, tenantId, createdAt: now, updatedAt: now, createdBy: req.identity!.uid });
    await adminDb.collection(`tenants/${tenantId}/auditLogs`).add({ tenantId, action: `${resource}.create`, entityId: record.id, actorId: req.identity!.uid, createdAt: now });
    res.status(201).json({ id: record.id });
  });
}

app.patch('/v1/clients/:id', requireTenant, requireActiveSubscription, requireRole('owner','admin','appraiser','cashier'), async (req, res) => {
  const data = clientSchema.partial().parse(req.body); const ref = adminDb.doc(`tenants/${req.tenant!.id}/clients/${req.params.id}`);
  if (!(await ref.get()).exists) return res.status(404).json({ error: 'not_found' });
  await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.identity!.uid }); return res.status(204).send();
});

app.get('/v1/members', requireTenant, requireRole('owner','admin'), async (req, res) => {
  const snapshot = await adminDb.collection(`tenants/${req.tenant!.id}/members`).orderBy('createdAt').get();
  res.json({ data: snapshot.docs.map(x => ({ id: x.id, ...x.data() })) });
});
app.put('/v1/members/:uid', requireTenant, requireActiveSubscription, requireRole('owner','admin'), async (req, res) => {
  const value = membershipSchema.parse(req.body); const tenantId = req.tenant!.id; const uid = String(req.params.uid);
  const existing = await adminDb.doc(`tenants/${tenantId}/members/${uid}`).get();
  if (existing.exists && existing.get('role') === 'owner') return res.status(409).json({ error: 'owner_membership_is_immutable' });
  const membership = { ...value, tenantId, userId: uid, createdAt: existing.get('createdAt') ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
  const batch = adminDb.batch();
  batch.set(adminDb.doc(`tenants/${tenantId}/members/${uid}`), membership, { merge: true });
  batch.set(adminDb.doc(`users/${uid}/memberships/${tenantId}`), membership, { merge: true });
  batch.set(adminDb.collection(`tenants/${tenantId}/auditLogs`).doc(), { tenantId, action: 'membership.upsert', entityId: uid, actorId: req.identity!.uid, role: value.role, status: value.status, createdAt: FieldValue.serverTimestamp() });
  await batch.commit(); return res.json({ data: membership });
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
  console.error(error); return res.status(500).json({ error: 'internal_error' });
});
