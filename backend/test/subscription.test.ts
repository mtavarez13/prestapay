import { describe, expect, it } from 'vitest';
import { hasSubscriptionAccess } from '../src/subscription.js';

describe('hasSubscriptionAccess', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  it('accepts an active non-expired subscription', () => expect(hasSubscriptionAccess({ status: 'active', accessUntil: '2026-10-07T12:00:00Z' }, now)).toBe(true));
  it('rejects expired access even if status is active', () => expect(hasSubscriptionAccess({ status: 'active', accessUntil: '2026-10-05T12:00:00Z' }, now)).toBe(false));
  it('rejects suspended access even before expiry', () => expect(hasSubscriptionAccess({ status: 'suspended', accessUntil: '2026-10-07T12:00:00Z' }, now)).toBe(false));
});
