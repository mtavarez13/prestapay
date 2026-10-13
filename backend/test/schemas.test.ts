import { describe, expect, it } from 'vitest';
import { loanSchema } from '../src/schemas.js';

const loan = {
  clientId: 'client-1', type: 'sin_garantia', capital: 10_000, rate: 10,
  installments: 12, balance: 10_000, status: 'activo', dueDate: '2027-10-13T23:59:59.000Z',
};

describe('loanSchema payment frequency', () => {
  it.each(['diaria', 'semanal', 'quincenal', 'mensual'] as const)('accepts %s', paymentFrequency => {
    expect(loanSchema.parse({ ...loan, paymentFrequency }).paymentFrequency).toBe(paymentFrequency);
  });

  it('defaults legacy requests to monthly', () => {
    expect(loanSchema.parse(loan).paymentFrequency).toBe('mensual');
  });

  it('rejects unsupported frequencies', () => {
    expect(() => loanSchema.parse({ ...loan, paymentFrequency: 'bimestral' })).toThrow();
  });
});
