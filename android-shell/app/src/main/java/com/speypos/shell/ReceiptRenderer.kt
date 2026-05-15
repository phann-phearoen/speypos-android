package com.speypos.shell

import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.Charset
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

class ReceiptRenderer {
    companion object {
        fun renderOrder(order: JSONObject, variant: String = "INTERNAL", language: String = "en"): ByteArray {
            val sb = StringBuilder()
            
            // ESC/POS Initialize: 1B 40
            val init = byteArrayOf(0x1B, 0x40)
            // ESC/POS Cut: 1D 56 00
            val cut = byteArrayOf(0x1D, 0x56, 0x00)

            val l = getTranslations(language)
            val isVoided = variant == "VOID" || order.optString("status") == "voided"
            
            val title = if (isVoided) "${l["title"]} (VOIDED)" else l["title"] ?: "Receipt"
            val shortId = order.optString("id").split("-").firstOrNull() ?: "N/A"
            val timestamp = formatTimestamp(order.optLong("created_at", System.currentTimeMillis()), language)

            sb.append(title).append("\n")
            sb.append("--------------------------------\n")
            sb.append("Order ID: ").append(shortId).append("\n")
            sb.append("Date: ").append(timestamp).append("\n")
            sb.append("--------------------------------\n")

            val items = order.optJSONArray("items") ?: JSONArray()
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                val qty = item.optInt("quantity", 1)
                val name = item.optString("menu_item_name", "Unknown")
                sb.append("$qty x $name\n")

                val customizations = item.optJSONArray("customizations") ?: JSONArray()
                val toppings = item.optJSONArray("toppings") ?: JSONArray()
                
                val details = mutableListOf<String>()
                for (j in 0 until customizations.length()) {
                    val c = customizations.optJSONObject(j) ?: continue
                    details.add(c.optString("value"))
                }
                for (j in 0 until toppings.length()) {
                    val t = toppings.optJSONObject(j) ?: continue
                    val tQty = t.optInt("quantity", 0)
                    val tUnit = t.optString("unit_label", "qty")
                    val qtyText = if (tUnit == "qty") "x$tQty" else "$tQty $tUnit"
                    details.add("${t.optString("name")} $qtyText")
                }

                if (details.isNotEmpty()) {
                    sb.append("  - ").append(details.joinToString(", ")).append("\n")
                }
            }

            sb.append("--------------------------------\n")
            
            if (isVoided) {
                sb.append("Reason: ").append(order.optString("void_reason", "N/A")).append("\n")
                sb.append("Note: ").append(order.optString("void_note", "-")).append("\n")
                sb.append("Voided at: ").append(formatTimestamp(order.optLong("voided_at", System.currentTimeMillis()), language)).append("\n")
            } else {
                val total = order.optInt("total_amount", 0).toDouble() / 100.0
                sb.append("Total: $").append(String.format(Locale.US, "%.2f", total)).append("\n")
            }
            
            sb.append("\n\n\n")

            val textBytes = sb.toString().toByteArray(Charset.forName("UTF-8"))
            val result = ByteArray(init.size + textBytes.size + cut.size)
            System.arraycopy(init, 0, result, 0, init.size)
            System.arraycopy(textBytes, 0, result, init.size, textBytes.size)
            System.arraycopy(cut, 0, result, init.size + textBytes.size, cut.size)
            
            return result
        }

        private fun formatTimestamp(millis: Long, language: String): String {
            val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .withLocale(if (language == "km") Locale("km", "KH") else Locale.US)
            return formatter.format(Instant.ofEpochMilli(millis))
        }

        private fun getTranslations(language: String): Map<String, String> {
            // Simplified translations for the receipt
            return if (language == "km") {
                mapOf(
                    "title" to "វិក្កយបត្របញ្ជាទិញ",
                    "void_title" to "វិក្កយបត្រមោឃៈ"
                )
            } else {
                mapOf(
                    "title" to "Order Receipt",
                    "void_title" to "VOID RECEIPT"
                )
            }
        }
    }
}
