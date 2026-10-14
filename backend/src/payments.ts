export function calculatePaymentBalance(previousBalance: number, amount: number): number {
  if (!Number.isFinite(previousBalance) || previousBalance < 0) throw Object.assign(new Error('invalid_loan_balance'), { statusCode: 409 });
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('invalid_payment_amount'), { statusCode: 422 });
  if (amount > previousBalance) throw Object.assign(new Error('payment_exceeds_balance'), { statusCode: 409 });
  return Math.max(0, previousBalance - amount);
}

export function coveredInstallments(amount: number, installmentAmount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(installmentAmount) || installmentAmount <= 0) return 0;
  return Math.floor((amount + 0.005) / installmentAmount);
}
