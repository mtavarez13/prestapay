import { mkdir, writeFile } from 'node:fs/promises';
import { buildThermalReceiptPdf } from '../src/services/printService';
import type { PrinterSettings, ReceiptData, TenantBranding } from '../src/types';

const branding: TenantBranding = {
  businessName: 'INMARTAGO SRL', legalName: 'Inmartago Servicios Financieros SRL', taxId: '1-31-00000-1',
  phone: '809-555-0101', email: 'cobros@inmartago.do', address: 'Santo Domingo, Republica Dominicana',
  logoUrl: '', primaryColor: '#0f766e', accentColor: '#f59e0b', currency: 'DOP', locale: 'es-DO', notaryData: '',
};
const printer: PrinterSettings = { paperWidth: 58, marginMm: 3, copies: 1, showLogo: true, footer: 'Conserve este comprobante' };
const receipt: ReceiptData = {
  number: 'REC-MUESTRA-001', issuedAt: new Date('2026-10-13T14:30:00-04:00').toISOString(), customerName: 'Juan Perez',
  description: 'Abono correspondiente a la cuota del prestamo', amount: 2500, previousBalance: 18500, balance: 16000,
  contractNumber: 'PRE-8A7B6C5D', loanType: 'sin_garantia', capital: 20000, rate: 10, installments: 10, paymentFrequency: 'quincenal',
};

await mkdir('output/pdf', { recursive: true });
const pdf = await buildThermalReceiptPdf(branding, printer, receipt);
await writeFile('output/pdf/recibo-termico-muestra-58mm.pdf', Buffer.from(pdf.output('arraybuffer')));
