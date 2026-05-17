package com.speypos.shell

import android.content.Context
import android.os.Build
import android.util.Log
import kotlin.system.exitProcess

class SpeyposCrashHandler(
    private val context: Context,
    private val configStore: NativeConfigStore,
    private val defaultHandler: Thread.UncaughtExceptionHandler?
) : Thread.UncaughtExceptionHandler {

    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        try {
            Log.e("SpeyposCrash", "CRITICAL: Uncaught exception on thread ${thread.name}", throwable)
            DiagnosticsManager.addBreadcrumb("CRASH: ${throwable.message}")

            val report = buildCrashReport(thread, throwable)
            sendCrashToTelegram(report)
        } catch (e: Exception) {
            Log.e("SpeyposCrash", "Failed to process crash report", e)
        } finally {
            // Always pass to the default handler to ensure the app actually crashes/restarts properly
            defaultHandler?.uncaughtException(thread, throwable) ?: exitProcess(1)
        }
    }

    private fun buildCrashReport(thread: Thread, throwable: Throwable): String {
        return """
            *🛑 NATIVE CRASH REPORT*
            
            *App:* Speypos Android Shell
            *Device:* ${Build.MANUFACTURER} ${Build.MODEL} (API ${Build.VERSION.SDK_INT})
            *Thread:* ${thread.name}
            
            *Exception:*
            `${throwable.javaClass.simpleName}: ${throwable.message}`
            
            *Recent Breadcrumbs:*
            ```
            ${DiagnosticsManager.dumpBreadcrumbs().takeLast(1000)}
            ```
            
            *Stack Trace:*
            ```
            ${Log.getStackTraceString(throwable).take(1500)}
            ```
        """.trimIndent()
    }

    private fun sendCrashToTelegram(message: String) {
        try {
            val token = configStore.getTelegramToken()
            val chatId = configStore.getShiftTrackerChatId()

            if (token.isNotBlank() && chatId.isNotBlank()) {
                // Allow networking on main thread for this final report
                val policy = android.os.StrictMode.ThreadPolicy.Builder().permitAll().build()
                android.os.StrictMode.setThreadPolicy(policy)

                // We run this synchronously because the process is about to die
                TelegramReporter.sendMessage(token, chatId, message, timeoutMs = 5000)
            }
        } catch (e: Exception) {
            Log.e("SpeyposCrash", "Could not send crash to Telegram", e)
        }
    }
}
