package com.speypos.shell

import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class TelegramReporter {
    companion object {
        private const val TAG = "TelegramReporter"

        fun sendMessage(botToken: String, chatId: String, text: String, timeoutMs: Int = 3000) {
            if (botToken.isBlank() || chatId.isBlank() || text.isBlank()) {
                Log.w(TAG, "Missing required Telegram parameters: token=$botToken, chat=$chatId")
                return
            }

            val endpoint = "https://api.telegram.org/bot$botToken/sendMessage"
            val payload = JSONObject()
                .put("chat_id", chatId)
                .put("text", text)
                .put("parse_mode", "Markdown")

            var connection: HttpURLConnection? = null
            try {
                val url = URL(endpoint)
                connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = timeoutMs
                connection.readTimeout = timeoutMs
                connection.setRequestProperty("Content-Type", "application/json")

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                } else {
                    val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: "No error body"
                    Log.e(TAG, "Failed to send Telegram message. Code: $responseCode, Error: $errorBody")
                    throw Exception("Telegram API error: $responseCode")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception while sending Telegram message: ${e.message}", e)
                throw e
            } finally {
                connection?.disconnect()
            }
        }
    }
}
