package com.prestapay.mobile.printing

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.prestapay.mobile.data.Client
import com.prestapay.mobile.data.Loan
import com.prestapay.mobile.data.TenantInfo
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object LoanContractPdf {
    private const val width = 595; private const val height = 842; private const val margin = 52
    fun share(context: Context, tenant: TenantInfo, client: Client, loan: Loan) {
        val directory = File(context.cacheDir, "contracts").apply { mkdirs() }
        val number = loan.contractNumber ?: "PRE-${loan.id.take(8).uppercase()}"; val file = File(directory, "contrato-$number.pdf")
        create(file, tenant, client, loan, number)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "application/pdf"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }, "Compartir contrato"))
    }

    private fun create(file: File, tenant: TenantInfo, client: Client, loan: Loan, number: String) {
        val document = PdfDocument(); var pageNumber = 0; var page: PdfDocument.Page? = null; var y = margin.toFloat()
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(15, 23, 42); textSize = 10f }
        fun newPage() { page?.let(document::finishPage); pageNumber += 1; page = document.startPage(PdfDocument.PageInfo.Builder(width, height, pageNumber).create()); y = margin.toFloat() }
        fun text(value: String, bold: Boolean = false, size: Float = 10f, gap: Float = 8f) { paint.typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT; paint.textSize = size; var rest = value; while (rest.isNotEmpty()) { if (y > height - 62) newPage(); val count = paint.breakText(rest, true, (width - margin * 2).toFloat(), null).coerceAtLeast(1); val breakAt = if (count < rest.length) rest.lastIndexOf(' ', count).takeIf { it > 0 } ?: count else count; page!!.canvas.drawText(rest.substring(0, breakAt).trim(), margin.toFloat(), y, paint); rest = rest.substring(breakAt).trimStart(); y += size + 4 }; y += gap }
        fun money(value: Double) = "${tenant.branding.currency} ${String.format(Locale.US, "%,.2f", value)}"
        val interest = loan.interestAmount ?: loan.capital * loan.rate / 100.0; val total = loan.totalPayable ?: loan.capital + interest; val installment = loan.installmentAmount ?: total / loan.installments.coerceAtLeast(1)
        val date = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.of("America/Santo_Domingo")); val issued = date.format(Instant.now())
        newPage(); text(tenant.branding.businessName.uppercase(), true, 16f, 5f); text("CONTRATO DE PRESTAMO - BORRADOR PARA LEGALIZACION", true, 14f, 4f); text("Contrato $number | Fecha $issued", false, 9f, 12f)
        text("AVISO: Este documento es un borrador privado. Solo adquiere caracter notarial cuando un notario publico competente verifica las partes, recibe su consentimiento y cumple las formalidades aplicables.", true, 9f, 12f)
        text("ENTRE:", true, 11f, 5f); text("${tenant.branding.legalName.ifBlank { tenant.branding.businessName }}, RNC/identificacion ${tenant.branding.taxId.ifBlank { "no indicado" }}, con domicilio en ${tenant.branding.address.ifBlank { "no indicado" }}, EL PRESTAMISTA; y ${client.name}, documento ${client.identityNumber ?: "no indicado"}, con domicilio en ${client.address.ifBlank { "no indicado" }}, EL PRESTATARIO.")
        text("PRIMERO - OBJETO Y DESEMBOLSO.", true); text("EL PRESTAMISTA entrega a EL PRESTATARIO ${money(loan.capital)}. Las partes conservaran constancia fehaciente del desembolso.")
        text("SEGUNDO - COSTO Y FORMA DE PAGO.", true); text("Tasa pactada para el plazo: ${loan.rate}%. Interes estimado: ${money(interest)}. Total estimado: ${money(total)}. Se pagaran ${loan.installments} cuotas de ${money(installment)}, con frecuencia ${loan.paymentFrequency} y vencimiento ${loan.dueDate.take(10)}.")
        text("TERCERO - PAGOS Y COBRO.", true); text("Cada pago se documentara mediante recibo con fecha, monto, concepto y balance. No se cobraran conceptos no pactados o no permitidos. La gestion de cobro sera respetuosa, proporcional y conforme a la ley.")
        text("CUARTO - TERMINACION.", true); text("El contrato termina por pago total, acuerdo escrito u otra causa legal. Ante pago anticipado, EL PRESTAMISTA entregara una liquidacion del saldo.")
        text("QUINTO - LEY APLICABLE.", true); text("Este contrato se interpreta conforme a las leyes de la Republica Dominicana. Si EL PRESTAMISTA es una entidad regulada, debera adecuarlo a la Ley 183-02 y a la normativa vigente de proteccion al usuario financiero.")
        text("PLAN INDICATIVO", true, 11f); repeat(loan.installments) { index -> text("Cuota ${index + 1} de ${loan.installments} | ${money(installment)} | Frecuencia ${loan.paymentFrequency}", false, 8f, 1f) }
        text("\n____________________________        ____________________________", false, 10f, 2f); text("EL PRESTAMISTA                         EL PRESTATARIO", false, 9f, 14f)
        text("CERTIFICACION NOTARIAL (A COMPLETAR POR EL NOTARIO)", true, 9f); text("Yo, ______________________________, Notario Publico, matricula __________, CERTIFICO Y DOY FE de que las firmas fueron puestas libre y voluntariamente en mi presencia por las personas identificadas. Lugar y fecha: ______________________________.", false, 9f)
        text("Referencias para revision profesional: Codigo Civil dominicano; Ley 140-15 del Notariado; Ley 155-17 y Reglamento 408-17 cuando correspondan; y Ley 183-02 para entidades supervisadas.", false, 7.5f)
        page?.let(document::finishPage); FileOutputStream(file).use(document::writeTo); document.close()
    }
}
