import type { jsPDF as JsPdf } from 'jspdf';
import { Client, Loan, Tenant } from '../types';
import { addPaymentPeriods, frequencyLabels, loanTerms } from './loanService';

type ContractInput = { tenant: Tenant; client: Client; loan: Loan; issuedAt?: Date };

const money = (value: number, currency: string) => `${currency} ${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function buildLoanContractPdf({ tenant, client, loan, issuedAt = new Date() }: ContractInput): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18; const width = 210 - margin * 2; const bottom = 276; let y = 18;
  const frequency = loan.paymentFrequency ?? 'mensual';
  const terms = loanTerms(loan.capital, loan.rate, loan.installments);
  const contractNumber = loan.contractNumber || `PRE-${loan.id.slice(0, 8).toUpperCase()}`;
  const ensure = (height: number) => { if (y + height > bottom) { pdf.addPage(); y = 18; } };
  const paragraph = (text: string, options: { bold?: boolean; size?: number; gap?: number } = {}) => {
    pdf.setFont('helvetica', options.bold ? 'bold' : 'normal'); pdf.setFontSize(options.size ?? 10);
    const lines = pdf.splitTextToSize(text, width); ensure(lines.length * 5 + (options.gap ?? 3));
    pdf.text(lines, margin, y); y += lines.length * 5 + (options.gap ?? 3);
  };
  const field = (label: string, value: string) => { ensure(7); pdf.setFont('helvetica', 'bold'); pdf.text(`${label}:`, margin, y); pdf.setFont('helvetica', 'normal'); pdf.text(value || 'No indicado', margin + 43, y); y += 6; };

  pdf.setTextColor(8, 51, 68); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.text(tenant.branding.businessName, 105, y, { align: 'center' }); y += 7;
  pdf.setTextColor(15, 23, 42); pdf.setFontSize(14); pdf.text('CONTRATO DE PRESTAMO - BORRADOR PARA LEGALIZACION', 105, y, { align: 'center' }); y += 7;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.text(`Contrato ${contractNumber} | Fecha ${issuedAt.toLocaleDateString('es-DO')}`, 105, y, { align: 'center' }); y += 9;
  pdf.setFillColor(255, 247, 214); pdf.roundedRect(margin, y - 4, width, 17, 2, 2, 'F');
  paragraph('AVISO: Este documento es un borrador privado. Solo adquiere carácter notarial cuando un notario público competente verifica la identidad y capacidad de las partes, recibe su consentimiento, instrumenta o legaliza las firmas y cumple las formalidades aplicables.', { bold: true, size: 8.5, gap: 7 });

  paragraph('ENTRE:', { bold: true, size: 11 });
  paragraph(`${tenant.branding.legalName || tenant.branding.businessName}, RNC/identificación ${tenant.branding.taxId || 'no indicado'}, con domicilio en ${tenant.branding.address || 'no indicado'}, en lo adelante EL PRESTAMISTA; y ${client.name}, documento de identidad ${client.identityNumber || 'no indicado'}, con domicilio en ${client.address || 'no indicado'}, en lo adelante EL PRESTATARIO. Ambas partes declaran tener capacidad para contratar y convienen lo siguiente:`);

  paragraph('PRIMERO - OBJETO Y DESEMBOLSO.', { bold: true });
  paragraph(`EL PRESTAMISTA entrega a EL PRESTATARIO la suma de ${money(loan.capital, tenant.branding.currency)}. Las partes deberán anexar y conservar la constancia fehaciente del medio de pago o desembolso.`);
  paragraph('SEGUNDO - COSTO Y FORMA DE PAGO.', { bold: true });
  paragraph(`La tasa pactada para el plazo total es ${loan.rate.toFixed(2)}%. El interés estimado es ${money(terms.interestAmount, tenant.branding.currency)} y el total estimado a pagar es ${money(terms.totalPayable, tenant.branding.currency)}. EL PRESTATARIO pagará ${loan.installments} cuotas de aproximadamente ${money(terms.installmentAmount, tenant.branding.currency)}, con frecuencia ${frequencyLabels[frequency].toLowerCase()}, iniciando el ${addPaymentPeriods(issuedAt, frequency, 1).toLocaleDateString('es-DO')} y con vencimiento final el ${new Date(loan.dueDate).toLocaleDateString('es-DO')}. Cualquier redondeo se ajustará en la última cuota.`);
  paragraph('TERCERO - APLICACION DE PAGOS.', { bold: true });
  paragraph('Los pagos se documentarán mediante recibo e identificarán fecha, monto, concepto y balance. No se cobrarán cargos, comisiones, penalidades ni conceptos que no hayan sido informados y aceptados expresamente por las partes y que no estén permitidos por la normativa aplicable.');
  paragraph('CUARTO - MORA Y COBRO.', { bold: true });
  paragraph('Ante un incumplimiento, EL PRESTAMISTA notificará el balance y concederá la oportunidad de pago correspondiente antes de iniciar las acciones legales disponibles. Toda gestión de cobro deberá realizarse con respeto, proporcionalidad y sin prácticas abusivas. Los gastos legales solo procederán cuando estén debidamente sustentados y sean legalmente exigibles.');
  paragraph('QUINTO - PAGO ANTICIPADO Y TERMINACION.', { bold: true });
  paragraph('EL PRESTATARIO podrá solicitar el pago anticipado total o parcial. EL PRESTAMISTA entregará una liquidación escrita del saldo y, una vez satisfechas las obligaciones, emitirá constancia de saldo. El contrato termina por pago total, acuerdo escrito o cualquier otra causa admitida por la ley.');
  paragraph('SEXTO - DATOS Y NOTIFICACIONES.', { bold: true });
  paragraph(`Las notificaciones se enviarán a los datos informados por las partes: prestamista ${tenant.branding.email || tenant.branding.phone || 'no indicado'}; prestatario ${client.phone || 'no indicado'}. Las partes se obligan a comunicar cambios de contacto. El tratamiento de información deberá limitarse a la administración y cobro legítimo del préstamo.`);
  paragraph('SEPTIMO - LEY APLICABLE Y JURISDICCION.', { bold: true });
  paragraph('Este contrato se interpreta conforme a las leyes de la República Dominicana. Las partes procurarán una solución amigable y, de no ser posible, acudirán a la jurisdicción competente. Si EL PRESTAMISTA es una entidad regulada, deberá adecuar este borrador a la Ley núm. 183-02 y a la normativa vigente de protección al usuario financiero.');
  paragraph('OCTAVO - INTEGRIDAD Y ACEPTACION.', { bold: true });
  paragraph('Las partes declaran haber leído y comprendido las condiciones esenciales, recibir una copia y aceptar únicamente los espacios completados al momento de la firma. Cualquier modificación deberá constar por escrito.');

  paragraph('PLAN INDICATIVO DE CUOTAS', { bold: true, size: 11 });
  for (let index = 1; index <= loan.installments; index += 1) {
    ensure(6); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    const date = addPaymentPeriods(issuedAt, frequency, index).toLocaleDateString('es-DO');
    pdf.text(`Cuota ${String(index).padStart(3, '0')}  |  ${date}  |  ${money(terms.installmentAmount, tenant.branding.currency)}`, margin, y); y += 4.5;
  }

  ensure(56); y += 6; pdf.line(margin, y, margin + 70, y); pdf.line(122, y, 192, y); y += 5;
  pdf.setFontSize(9); pdf.text('EL PRESTAMISTA / representante', margin, y); pdf.text('EL PRESTATARIO', 122, y); y += 18;
  pdf.line(margin, y, margin + 70, y); pdf.text('Nombre, cédula y firma del testigo', margin, y + 5); y += 15;
  paragraph('CERTIFICACION NOTARIAL (A COMPLETAR EXCLUSIVAMENTE POR EL NOTARIO)', { bold: true, size: 9 });
  paragraph('Yo, ______________________________________, Notario Público de los del número para ____________________, matrícula núm. __________, CERTIFICO Y DOY FE de que las firmas que anteceden fueron puestas libre y voluntariamente en mi presencia por las personas identificadas, quienes declararon que esas son las firmas que acostumbran usar. En ____________________, República Dominicana, a los ____ días del mes de ______________ del año ______.', { size: 8.5 });
  paragraph('Referencias normativas para revisión profesional: Código Civil dominicano sobre obligaciones y contratos; Ley núm. 140-15 del Notariado; Ley núm. 155-17 y Reglamento núm. 408-17 sobre constancias de pago y debida diligencia cuando correspondan; y, para entidades supervisadas, Ley núm. 183-02 y normativa vigente de protección al usuario financiero.', { size: 7.5 });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(100); pdf.text(`PrestaPay | ${contractNumber} | Página ${page} de ${pages}`, margin, 290); }
  return pdf;
}

export async function downloadLoanContract(input: ContractInput): Promise<void> {
  const number = input.loan.contractNumber || `PRE-${input.loan.id.slice(0, 8).toUpperCase()}`;
  (await buildLoanContractPdf(input)).save(`contrato-${number}.pdf`);
}
