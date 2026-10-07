export type SubscriptionLike = { status?: string; accessUntil?: unknown; currentPeriodEnd?: unknown };

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  return Number.NaN;
}

export function hasSubscriptionAccess(subscription: SubscriptionLike, now = Date.now()): boolean {
  if (!['trialing', 'active'].includes(subscription.status ?? '')) return false;
  const expires = toMillis(subscription.accessUntil ?? subscription.currentPeriodEnd);
  return Number.isFinite(expires) && expires > now;
}
