import { describe, expect, it } from 'vitest';
import { calculatePaymentBalance, coveredInstallments } from '../src/payments.js';

describe('calculatePaymentBalance', () => {
  it('applies a partial payment', () => expect(calculatePaymentBalance(10_000, 2_500)).toBe(7_500));
  it('closes the balance with an exact payment', () => expect(calculatePaymentBalance(1_500, 1_500)).toBe(0));
  it('rejects overpayments', () => expect(() => calculatePaymentBalance(1_000, 1_001)).toThrow('payment_exceeds_balance'));
  it('rejects invalid persisted balances', () => expect(() => calculatePaymentBalance(-1, 1)).toThrow('invalid_loan_balance'));
});

describe('coveredInstallments', () => {
  it('counts all complete installments included in a payment', () => {
    expect(coveredInstallments(3_000, 1_000)).toBe(3);
    expect(coveredInstallments(2_500, 1_000)).toBe(2);
  });
  it('does not advance a period for a partial or invalid installment', () => {
    expect(coveredInstallments(500, 1_000)).toBe(0);
    expect(coveredInstallments(1_000, 0)).toBe(0);
  });
});
