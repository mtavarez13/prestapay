import { ReceiptData, TenantBranding, PrinterSettings } from '../types';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function receiptHtml(branding: TenantBranding, printer: PrinterSettings, receipt: ReceiptData): string {
  const width = printer.paperWidth;
  const logo = printer.showLogo && branding.logoUrl
    ? `<img class="logo" src="${escapeHtml(branding.logoUrl)}" alt="Logo">`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${escapeHtml(receipt.number)}</title>
  <style>
    @page { size: ${width}mm auto; margin: ${printer.marginMm}mm; }
    * { box-sizing: border-box; } body { width: ${width - printer.marginMm * 2}mm; margin: 0; color: #000; font: 11px ui-monospace, SFMono-Regular, Consolas, monospace; }
    .center { text-align:center } .logo { max-width: 70%; max-height: 18mm; object-fit: contain; }
    .rule { border-top: 1px dashed #000; margin: 8px 0; } .row { display:flex; justify-content:space-between; gap:8px; }
    h1 { font-size: 16px; margin: 4px 0; } p { margin: 2px 0; } .total { font-size:14px; font-weight:700; }
  </style></head><body>
  <header class="center">${logo}<h1>${escapeHtml(branding.businessName)}</h1><p>${escapeHtml(branding.taxId)}</p><p>${escapeHtml(branding.address)}</p><p>${escapeHtml(branding.phone)}</p></header>
  <div class="rule"></div><div class="row"><span>RECIBO</span><strong>${escapeHtml(receipt.number)}</strong></div>
  <div class="row"><span>Fecha</span><span>${escapeHtml(new Date(receipt.issuedAt).toLocaleString(branding.locale || 'es-DO'))}</span></div>
  <div class="rule"></div><p>Cliente: ${escapeHtml(receipt.customerName)}</p><p>${escapeHtml(receipt.description)}</p>
  <div class="rule"></div><div class="row total"><span>TOTAL</span><span>${escapeHtml(branding.currency)} ${receipt.amount.toFixed(2)}</span></div>
  ${receipt.balance == null ? '' : `<div class="row"><span>Balance</span><span>${escapeHtml(branding.currency)} ${receipt.balance.toFixed(2)}</span></div>`}
  <div class="rule"></div><footer class="center"><p>${escapeHtml(printer.footer)}</p></footer>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200));</script></body></html>`;
}

export function previewReceipt(branding: TenantBranding, printer: PrinterSettings, receipt: ReceiptData): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=440,height=720');
  if (!popup) throw new Error('El navegador bloqueó la vista previa. Habilita ventanas emergentes para este sitio.');
  popup.document.open();
  popup.document.write(receiptHtml(branding, printer, receipt));
  popup.document.close();
}
