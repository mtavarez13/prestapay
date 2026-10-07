package com.prestapay.mobile.printing

import com.prestapay.mobile.data.ReceiptModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ThermalPrinterTest {
    @Test fun receiptUsesConfiguredWidthAndEscPosCommands() {
        val bytes = renderEscPos(ReceiptModel("Mi Empresa", "101", "Dirección", "809", "R-1", "Ana", "Abono", 100.0, paperWidth = 58))
        val text = bytes.copyOfRange(2, bytes.size - 3).toString(Charsets.ISO_8859_1)
        assertTrue(text.contains("Mi Empresa")); assertTrue(text.contains("R-1")); assertTrue(text.contains("Abono"))
        assertEquals(32, text.lineSequence().first().length)
        assertEquals(0x1B, bytes[0].toInt())
    }
}
