import { Timestamp } from 'firebase-admin/firestore';

export type PaymentFrequency = 'diaria' | 'semanal' | 'quincenal' | 'mensual';

export function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addPaymentPeriod(source: Date, frequency: PaymentFrequency): Date {
  const date = new Date(source);
  if (frequency === 'diaria') date.setDate(date.getDate() + 1);
  if (frequency === 'semanal') date.setDate(date.getDate() + 7);
  if (frequency === 'quincenal') date.setDate(date.getDate() + 15);
  if (frequency === 'mensual') date.setMonth(date.getMonth() + 1);
  return date;
}

export function isPastDue(value: unknown, now = new Date()): boolean {
  const date = asDate(value);
  if (!date) return false;
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return due < today;
}
