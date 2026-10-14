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

async function imageData(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url); if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => resolve(null); reader.readAsDataURL(blob); });
  } catch { return null; }
}

export async function buildThermalReceiptPdf(branding: TenantBranding, printer: PrinterSettings, receipt: ReceiptData) {
  const { jsPDF } = await import('jspdf');
  const width = printer.paperWidth; const margin = Math.max(2, printer.marginMm); const details = receipt.contractNumber ? 35 : 0;
  const height = Math.max(105, 105 + details + Math.max(0, Math.ceil(receipt.description.length / (width === 58 ? 30 : 46)) - 1) * 4);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height], compress: true });
  const right = width - margin; const usable = width - margin * 2; let y = margin + 2;
  const money = (value: number) => `${branding.currency} ${value.toLocaleString(branding.locale || 'es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const center = (value: string, size = 8, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); const lines = pdf.splitTextToSize(value, usable); lines.forEach((line: string) => { pdf.text(line, width / 2, y, { align: 'center' }); y += size * 0.42 + 1; }); };
  const left = (value: string, size = 7, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); const lines = pdf.splitTextToSize(value, usable); lines.forEach((line: string) => { pdf.text(line, margin, y); y += size * 0.42 + 1; }); };
  const row = (label: string, value: string, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(bold ? 8 : 7); pdf.text(label, margin, y); pdf.text(value, right, y, { align: 'right', maxWidth: usable * 0.62 }); y += bold ? 5 : 4; };
  const rule = () => { y += 1; pdf.setDrawColor(60); pdf.setLineDashPattern([1, 1], 0); pdf.line(margin, y, right, y); pdf.setLineDashPattern([], 0); y += 4; };

  if (printer.showLogo && branding.logoUrl) { const logo = await imageData(branding.logoUrl); if (logo) { try { pdf.addImage(logo, logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', width / 2 - 10, y, 20, 12, undefined, 'FAST'); y += 15; } catch { /* El recibo sigue siendo válido sin logo. */ } } }
  center(branding.businessName.toUpperCase(), 11, true); center(branding.legalName, 7); if (branding.taxId) center(`RNC/ID: ${branding.taxId}`, 7); if (branding.address) center(branding.address, 6.5); if (branding.phone) center(`Tel: ${branding.phone}`, 6.5); if (branding.email) center(branding.email, 6.5);
  center('PRESTAPAY - SISTEMA DE PRESTAMOS', 6.5, true); rule(); row('RECIBO', receipt.number, true); row('Fecha', new Date(receipt.issuedAt).toLocaleString(branding.locale || 'es-DO')); rule();
  left(`Cliente: ${receipt.customerName}`, 7.5, true); left(`Concepto: ${receipt.description}`, 7);
  if (receipt.contractNumber) { y += 1; left('DETALLES DEL PRESTAMO', 7.5, true); row('Contrato', receipt.contractNumber); if (receipt.loanType) row('Tipo', receipt.loanType); if (receipt.capital != null) row('Capital', money(receipt.capital)); if (receipt.rate != null) row('Tasa', `${receipt.rate}%`); if (receipt.installments != null) row('Cuotas', String(receipt.installments)); if (receipt.paymentFrequency) row('Frecuencia', receipt.paymentFrequency); }
  rule(); if (receipt.previousBalance != null) row('Saldo anterior', money(receipt.previousBalance)); row('PAGO RECIBIDO', money(receipt.amount), true); if (receipt.balance != null) row('SALDO PENDIENTE', money(receipt.balance), true); rule();
  const customFooter = printer.footer.trim(); if (customFooter && customFooter.toLocaleLowerCase() !== 'gracias por su pago') center(customFooter, 7); center('Gracias por su pago', 9, true); center('PrestaPay sistema de prestamos', 6.5); center('Comprobante generado electronicamente', 5.5); return pdf;
}

export async function downloadThermalReceiptPdf(branding: TenantBranding, printer: PrinterSettings, receipt: ReceiptData): Promise<void> {
  const pdf = await buildThermalReceiptPdf(branding, printer, receipt);
  pdf.save(`recibo-${receipt.number.replace(/[^a-z0-9_-]/gi, '-')}.pdf`);
}
