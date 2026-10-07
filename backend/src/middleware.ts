import type { NextFunction, Request, Response } from 'express';
import { adminAuth, adminDb } from './firebase.js';
import { hasSubscriptionAccess } from './subscription.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const match = req.header('authorization')?.match(/^Bearer (.+)$/);
  if (!match?.[1]) return res.status(401).json({ error: 'missing_token' });
  try { req.identity = await adminAuth.verifyIdToken(match[1], true); return next(); }
  catch { return res.status(401).json({ error: 'invalid_token' }); }
}

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const paramTenantId = Array.isArray(req.params.tenantId) ? req.params.tenantId[0] : req.params.tenantId;
  const tenantId = req.header('x-tenant-id') || paramTenantId;
  if (!tenantId || !req.identity) return res.status(400).json({ error: 'tenant_required' });
  const [tenant, member] = await Promise.all([
    adminDb.doc(`tenants/${tenantId}`).get(), adminDb.doc(`tenants/${tenantId}/members/${req.identity.uid}`).get(),
  ]);
  if (!tenant.exists || !member.exists || member.get('status') !== 'active') return res.status(403).json({ error: 'tenant_access_denied' });
  req.tenant = { id: tenantId, data: tenant.data()!, membership: member.data()! };
  return next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => roles.includes(req.tenant?.membership.role) ? next() : res.status(403).json({ error: 'insufficient_role' });
}

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  return req.tenant && hasSubscriptionAccess(req.tenant.data.subscription)
    ? next() : res.status(402).json({ error: 'subscription_inactive' });
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return req.identity?.superAdmin === true ? next() : res.status(403).json({ error: 'super_admin_required' });
}
