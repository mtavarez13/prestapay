package com.prestapay.mobile.printing

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.prestapay.mobile.data.ReceiptModel
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

data class PairedPrinter(val name: String, val address: String)

class ThermalPrinter(private val context: Context) {
    private val adapter: BluetoothAdapter? get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
    fun hasPermission() = Build.VERSION.SDK_INT < 31 || ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission")
    fun paired(): List<PairedPrinter> {
        check(hasPermission()) { "Permiso Bluetooth requerido" }
        return adapter?.bondedDevices?.sortedBy(BluetoothDevice::getName)?.map { PairedPrinter(it.name ?: "Impresora", it.address) }.orEmpty()
    }

    @SuppressLint("MissingPermission")
    fun print(address: String, receipt: ReceiptModel) {
        check(hasPermission()) { "Permiso Bluetooth requerido" }
        val device = adapter?.getRemoteDevice(address) ?: error("Bluetooth no disponible")
        val socket = device.createRfcommSocketToServiceRecord(UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"))
        adapter?.cancelDiscovery(); socket.connect()
        socket.outputStream.use { output -> output.write(renderEscPos(receipt)); output.flush() }
        socket.close()
    }
}

internal fun renderEscPos(r: ReceiptModel): ByteArray {
    val columns = if (r.paperWidth == 58) 32 else 48
    fun center(text: String) = text.take(columns).padStart((columns + text.take(columns).length) / 2).padEnd(columns)
    fun row(left: String, right: String): String { val rgt = right.take(columns / 2); return left.take(columns - rgt.length - 1).padEnd(columns - rgt.length) + rgt }
    val money = NumberFormat.getCurrencyInstance(Locale("es", "DO")).format(r.amount)
    val text = buildString {
        append(center(r.businessName)).append('\n'); if (r.taxId.isNotBlank()) append(center("RNC ${r.taxId}")).append('\n')
        append(center(r.address)).append('\n').append(center(r.phone)).append('\n').append("-".repeat(columns)).append('\n')
        append(row("RECIBO", r.number)).append('\n').append("Cliente: ${r.customer}\n${r.description}\n").append("-".repeat(columns)).append('\n')
        append(row("TOTAL", money)).append('\n').append("-".repeat(columns)).append('\n').append(center(r.footer)).append("\n\n\n")
    }
    return byteArrayOf(0x1B, 0x40) + text.toByteArray(Charsets.ISO_8859_1) + byteArrayOf(0x1D, 0x56, 0x00)
}
