package com.speypos.shell

import android.util.Log
import java.time.Instant
import java.util.Collections

object DiagnosticsManager {
    private const val TAG = "SpeyposDiagnostics"
    private const val MAX_CRUMBS = 100
    private val crumbs = Collections.synchronizedList(mutableListOf<String>())

    fun addBreadcrumb(message: String) {
        val timestamp = Instant.now().toString()
        val entry = "[$timestamp] $message"
        Log.i(TAG, "Breadcrumb: $message")
        
        synchronized(crumbs) {
            crumbs.add(entry)
            if (crumbs.size > MAX_CRUMBS) {
                crumbs.removeAt(0)
            }
        }
    }

    fun dumpBreadcrumbs(): String {
        return synchronized(crumbs) {
            crumbs.joinToString("\n")
        }
    }

    fun collectLogcat(): String {
        return try {
            val process = Runtime.getRuntime().exec("logcat -d -t 500")
            process.inputStream.bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            "Failed to collect Logcat: ${e.message}"
        }
    }

    fun clear() {
        crumbs.clear()
    }
}
