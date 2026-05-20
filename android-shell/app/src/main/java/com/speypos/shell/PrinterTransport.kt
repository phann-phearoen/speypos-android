package com.speypos.shell

import android.util.Log
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

class PrinterTransport {
    companion object {
        private const val TAG = "PrinterTransport"

        fun sendRawBytes(host: String, port: Int, payload: ByteArray, timeoutMs: Int = 5000) {
            val connectionId = (1000..9999).random()
            if (host.isBlank()) {
                throw IllegalArgumentException("Printer host is required")
            }

            var socket: Socket? = null
            try {
                Log.i(TAG, "[$connectionId] Connecting to printer at $host:$port (timeout: ${timeoutMs}ms)")
                socket = Socket()
                socket.connect(InetSocketAddress(host, port), timeoutMs)
                socket.soTimeout = timeoutMs

                val outputStream: OutputStream = socket.getOutputStream()
                Log.i(TAG, "[$connectionId] Sending ${payload.size} bytes to printer")
                outputStream.write(payload)
                outputStream.flush()
                
                Log.i(TAG, "[$connectionId] Print payload sent successfully")
            } catch (e: Exception) {
                Log.e(TAG, "[$connectionId] Failed to send bytes to printer: ${e.message}", e)
                throw e
            } finally {
                try {
                    socket?.close()
                } catch (e: Exception) {
                    Log.w(TAG, "[$connectionId] Error closing printer socket: ${e.message}")
                }
            }
        }
    }
}
