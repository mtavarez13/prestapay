package com.prestapay.mobile.printing

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.prestapay.mobile.data.CreateResult
import com.prestapay.mobile.data.Loan
import com.prestapay.mobile.data.TenantInfo
import com.prestapay.mobile.data.TransactionCreate
import java.io.File
import java.io.FileOutputStream
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

object ThermalReceiptPdf {
    fun share(context: Context, tenant: TenantInfo, loan: Loan?, payment: TransactionCreate, result: CreateResult) {
        val number = result.receiptNumber ?: result.receiptId ?: "REC-${System.currentTimeMillis()}"
        val directory = File(context.cacheDir, "receipts").apply { mkdirs() }
        val file = File(directory, "recibo-${number.replace(Regex("[^A-Za-z0-9_-]"), "-")}.pdf")
        create(file, tenant, loan, payment, result, number)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }, "Compartir recibo de pago"))
    }

    internal fun create(file: File, tenant: TenantInfo, loan: Loan?, payment: TransactionCreate, result: CreateResult, number: String) {
        val widthMm = tenant.printer.paperWidth.coerceIn(58, 80)
        val width = mm(widthMm.toFloat()); val height = mm(if (loan == null) 110f else 145f); val margin = mm(tenant.printer.marginMm.coerceIn(2, 8).toFloat())
        val document = PdfDocument(); val page = document.startPage(PdfDocument.PageInfo.Builder(width, height, 1).create()); val canvas = page.canvas
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 7f }
        var y = margin.toFloat() + 7f; val right = (width - margin).toFloat(); val usable = (width - margin * 2).toFloat()
        fun font(size: Float, bold: Boolean = false) { paint.textSize = size; paint.typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT }
        fun center(value: String, size: Float = 7f, bold: Boolean = false) { font(size, bold); wrap(value, paint, usable).forEach { canvas.drawText(it, width / 2f, y, paint.apply { textAlign = Paint.Align.CENTER }); y += size + 2f }; paint.textAlign = Paint.Align.LEFT }
        fun left(value: String, size: Float = 7f, bold: Boolean = false) { font(size, bold); wrap(value, paint, usable).forEach { canvas.drawText(it, margin.toFloat(), y, paint); y += size + 2f } }
        fun row(label: String, value: String, bold: Boolean = false) { font(if (bold) 7.5f else 6.5f, bold); paint.textAlign = Paint.Align.LEFT; canvas.drawText(label, margin.toFloat(), y, paint); paint.textAlign = Paint.Align.RIGHT; canvas.drawText(value, right, y, paint); paint.textAlign = Paint.Align.LEFT; y += if (bold) 11f else 9f }
        fun rule() { y += 2f; paint.strokeWidth = 0.7f; var x = margin.toFloat(); while (x < right) { canvas.drawLine(x, y, (x + 3f).coerceAtMost(right), y, paint); x += 5f }; y += 8f }
        fun money(value: Double) = "${tenant.branding.currency} ${String.format(Locale.US, "%,.2f", value)}"

        center(tenant.branding.businessName.uppercase(), 10f, true); if (tenant.branding.legalName.isNotBlank()) center(tenant.branding.legalName, 6.5f)
        if (tenant.branding.taxId.isNotBlank()) center("RNC/ID: ${tenant.branding.taxId}", 6.5f); if (tenant.branding.address.isNotBlank()) center(tenant.branding.address, 6f)
        if (tenant.branding.phone.isNotBlank()) center("Tel: ${tenant.branding.phone}", 6f); if (tenant.branding.email.isNotBlank()) center(tenant.branding.email, 6f)
        center("PRESTAPAY - SISTEMA DE PRESTAMOS", 6.5f, true); rule(); row("RECIBO", number, true)
        row("Fecha", ZonedDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a"))); rule()
        left("Cliente: ${loan?.clientName ?: "Cliente"}", 7f, true); left("Concepto: ${payment.description}", 6.5f)
        if (loan != null) { y += 2f; left("DETALLES DEL PRESTAMO", 7f, true); row("Contrato", loan.contractNumber ?: loan.id); row("Tipo", loan.type); row("Capital", money(loan.capital)); row("Tasa", "${loan.rate}%"); row("Cuotas", loan.installments.toString()); row("Frecuencia", loan.paymentFrequency) }
        rule(); if (loan != null) row("Saldo anterior", money(result.previousBalance)); row("PAGO RECIBIDO", money(payment.amount), true); if (loan != null) row("SALDO PENDIENTE", money(result.newBalance), true); rule()
        val footer = tenant.printer.footer.trim(); if (footer.isNotBlank() && !footer.equals("Gracias por su pago", true)) center(footer, 6.5f)
        center("Gracias por su pago", 9f, true); center("PrestaPay sistema de prestamos", 6f); center("Comprobante generado electronicamente", 5.5f)
        document.finishPage(page); FileOutputStream(file).use(document::writeTo); document.close()
    }

    private fun wrap(value: String, paint: Paint, width: Float): List<String> {
        val output = mutableListOf<String>(); var rest = value.trim()
        while (rest.isNotEmpty()) { val count = paint.breakText(rest, true, width, null).coerceAtLeast(1); val end = if (count < rest.length) rest.lastIndexOf(' ', count).takeIf { it > 0 } ?: count else count; output += rest.substring(0, end).trim(); rest = rest.substring(end).trimStart() }
        return output.ifEmpty { listOf("") }
    }
    private fun mm(value: Float) = (value * 72f / 25.4f).roundToInt()
}
