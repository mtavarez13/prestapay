import { PaymentFrequency } from '../types';

export const frequencyLabels: Record<PaymentFrequency, string> = {
  diaria: 'Diaria', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual',
};

export function addPaymentPeriods(source: Date, frequency: PaymentFrequency, count: number): Date {
  const date = new Date(source);
  const periods = Math.max(1, Math.min(600, count || 1));
  if (frequency === 'diaria') date.setDate(date.getDate() + periods);
  if (frequency === 'semanal') date.setDate(date.getDate() + periods * 7);
  if (frequency === 'quincenal') date.setDate(date.getDate() + periods * 15);
  if (frequency === 'mensual') date.setMonth(date.getMonth() + periods);
  return date;
}

export function loanDate(frequency: PaymentFrequency, count: number, source = new Date()): string {
  return addPaymentPeriods(source, frequency, count).toISOString().slice(0, 10);
}

export function loanTerms(capital: number, rate: number, installments: number) {
  const interestAmount = Math.round(capital * Math.max(0, rate) / 100 * 100) / 100;
  const totalPayable = Math.round((capital + interestAmount) * 100) / 100;
  const installmentAmount = Math.round(totalPayable / Math.max(1, installments) * 100) / 100;
  return { interestAmount, totalPayable, installmentAmount };
}

export function dateValue(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDateKey(value: unknown): string {
  const date = dateValue(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
