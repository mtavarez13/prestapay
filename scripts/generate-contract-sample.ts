import { mkdirSync, writeFileSync } from 'node:fs';
import { buildLoanContractPdf } from '../src/services/contractService.js';
import type { Client, Loan, Tenant } from '../src/types.js';

const tenant = {
  id: 'tenant-demo', slug: 'prestamista-demo', ownerId: 'owner', status: 'active',
  branding: { businessName: 'PRESTAMISTA DEMO', legalName: 'Prestamista Demo, SRL', taxId: '1-01-00000-1', phone: '809-555-0100', email: 'info@example.com', address: 'Santo Domingo, República Dominicana', logoUrl: '', primaryColor: '#0f766e', accentColor: '#f59e0b', currency: 'DOP', locale: 'es-DO', notaryData: '' },
  printer: { paperWidth: 80, marginMm: 3, copies: 1, showLogo: true, footer: 'Gracias' },
  subscription: { status: 'active', planId: 'standard', currentPeriodStart: '2026-10-01T00:00:00Z', currentPeriodEnd: '2027-10-01T00:00:00Z', accessUntil: '2027-10-01T00:00:00Z', cancelAtPeriodEnd: false, updatedAt: '2026-10-13T00:00:00Z' },
  createdAt: '2026-10-13T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z',
} satisfies Tenant;
const client = { id: 'client-demo', tenantId: tenant.id, name: 'Juan Pérez', identityNumber: '001-0000000-1', phone: '809-555-0199', address: 'Santo Domingo, República Dominicana', createdAt: '2026-10-13T00:00:00Z' } satisfies Client;
const loan = { id: 'loan-demo-001', tenantId: tenant.id, clientId: client.id, clientName: client.name, type: 'sin_garantia', capital: 100_000, rate: 12, installments: 12, paymentFrequency: 'mensual', installmentAmount: 9_333.33, interestAmount: 12_000, totalPayable: 112_000, balance: 112_000, status: 'activo', nextPaymentDate: '2026-11-13T23:59:59Z', dueDate: '2027-10-13T23:59:59Z', contractNumber: 'PRE-DEMO001', createdAt: '2026-10-13T00:00:00Z' } satisfies Loan;

mkdirSync('output/pdf', { recursive: true });
const pdf = await buildLoanContractPdf({ tenant, client, loan, issuedAt: new Date('2026-10-13T12:00:00-04:00') });
writeFileSync('output/pdf/contrato-prestamo-muestra.pdf', Buffer.from(pdf.output('arraybuffer')));
