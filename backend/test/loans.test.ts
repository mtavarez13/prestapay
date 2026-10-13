import { describe, expect, it } from 'vitest';
import { addPaymentPeriod, isPastDue } from '../src/loans.js';

describe('loan schedule helpers', () => {
  const start = new Date('2026-10-13T12:00:00Z');
  it('advances daily, weekly and biweekly collections', () => {
    expect(addPaymentPeriod(start, 'diaria').toISOString().slice(0, 10)).toBe('2026-10-14');
    expect(addPaymentPeriod(start, 'semanal').toISOString().slice(0, 10)).toBe('2026-10-20');
    expect(addPaymentPeriod(start, 'quincenal').toISOString().slice(0, 10)).toBe('2026-10-28');
  });
  it('detects overdue dates without marking today overdue', () => {
    expect(isPastDue('2026-10-12T23:59:59Z', start)).toBe(true);
    expect(isPastDue('2026-10-13T12:00:00Z', start)).toBe(false);
  });
});
