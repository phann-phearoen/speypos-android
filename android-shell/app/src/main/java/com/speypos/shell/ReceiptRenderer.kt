package com.speypos.shell

import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.Charset
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

class ReceiptRenderer {
    companion object {
        private const val LINE_WIDTH = 42

        fun renderOrder(
            order: JSONObject,
            variant: String = "INTERNAL",
            language: String = "en",
            currencyCode: String = "USD"
        ): ByteArray {
            val isVoided = variant == "VOID" || order.optString("status") == "voided"
            
            val out = mutableListOf<Byte>()

            // ESC/POS Initialize: 1B 40
            out.addAll(listOf(0x1B.toByte(), 0x40.toByte()))
            
            // Set double-height/width for title
            out.addAll(listOf(0x1B.toByte(), 0x21.toByte(), 0x30.toByte())) // Double height & width
            out.addAll(centerAlign())
            
            val title = if (isVoided) getTranslation("receipt.void_title", language) else getTranslation("receipt.title", language)
            out.addAll(textBytes("$title\n"))
            
            // Reset to normal font
            out.addAll(listOf(0x1B.toByte(), 0x21.toByte(), 0x00.toByte()))
            out.addAll(textBytes("\n"))

            // Order Info
            out.addAll(leftAlign())
            val orderId = order.optString("id").split("-").lastOrNull()?.takeLast(6) ?: "N/A"
            out.addAll(textBytes("${getTranslation("receipt.order_id", language).replace("{orderId}", orderId)}\n"))
            val timestamp = formatTimestamp(order.optLong(if (isVoided) "voided_at" else "created_at", System.currentTimeMillis()), language)
            out.addAll(textBytes("${getTranslation("receipt.date", language).replace("{timestamp}", timestamp)}\n"))
            val staffName = order.optString("staff_name", "Unknown")
            out.addAll(textBytes("${getTranslation("receipt.staff_label", language)}: $staffName\n"))
            
            out.addAll(textBytes("-".repeat(LINE_WIDTH) + "\n"))

            // Items Grouping
            val items = order.optJSONArray("items") ?: JSONArray()
            val itemMap = mutableMapOf<String, MutableList<JSONObject>>()
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                val name = item.optString("menu_item_name", "Unknown")
                itemMap.getOrPut(name) { mutableListOf() }.add(item)
            }

            itemMap.forEach { (name, variants) ->
                out.addAll(textBytes("* $name\n"))
                variants.forEach { v ->
                    val details = mutableListOf<String>()
                    val customs = v.optJSONArray("customizations") ?: JSONArray()
                    for (j in 0 until customs.length()) {
                        details.add(customs.optJSONObject(j)?.optString("value") ?: "")
                    }
                    val toppings = v.optJSONArray("toppings") ?: JSONArray()
                    for (j in 0 until toppings.length()) {
                        val t = toppings.optJSONObject(j) ?: continue
                        val qty = t.optInt("quantity", 1)
                        val unit = t.optString("unit_label", "qty")
                        val suffix = if (unit == "qty" || unit.isBlank()) "x$qty" else "$qty $unit"
                        details.add("${t.optString("name")} $suffix")
                    }
                    
                    val detailCsv = details.filter { it.isNotBlank() }.joinToString(", ")
                    val qtyText = "x ${v.optInt("quantity", 1)}"
                    if (detailCsv.isNotBlank()) {
                        out.addAll(textBytes("  - ($detailCsv) $qtyText\n"))
                    } else {
                        out.addAll(textBytes("  - $qtyText\n"))
                    }
                }
            }

            out.addAll(textBytes("-".repeat(LINE_WIDTH) + "\n"))

            // Totals
            if (isVoided) {
                out.addAll(textBytes("${getTranslation("receipt.void_reason_label", language)}: ${order.optString("void_reason", "N/A")}\n"))
                val note = order.optString("void_note", "")
                if (note.isNotBlank()) {
                    out.addAll(textBytes("${getTranslation("receipt.void_note_label", language)}: $note\n"))
                }
            } else {
                val total = formatCurrency(order.optInt("total_amount", 0), currencyCode)
                out.addAll(textBytes(justifyRight("${getTranslation("receipt.total", language).replace("{total}", total)}\n")))
                
                val payment = order.optJSONObject("payment")
                val pType = payment?.optString("payment_type", "cash") ?: "cash"
                val pLabel = getTranslation("order_message.${pType}_payment", language)
                out.addAll(textBytes("${getTranslation("receipt.payment_type", language).replace("{paymentType}", pLabel)}\n"))
            }

            out.addAll(textBytes("\n"))
            out.addAll(centerAlign())
            out.addAll(textBytes("${getTranslation("receipt.thank_you", language)}\n"))
            
            // Feed and Cut
            out.addAll(textBytes("\n\n\n\n"))
            out.addAll(listOf(0x1D.toByte(), 0x56.toByte(), 0x41.toByte(), 0x00.toByte())) // Feed + Partial Cut

            return out.toByteArray()
        }

        private fun textBytes(text: String): List<Byte> {
            return text.toByteArray(Charset.forName("UTF-8")).toList()
        }

        private fun centerAlign() = listOf(0x1B.toByte(), 0x61.toByte(), 0x01.toByte())
        private fun leftAlign() = listOf(0x1B.toByte(), 0x61.toByte(), 0x00.toByte())

        private fun justifyRight(text: String): String {
            val trimmed = text.trim()
            if (trimmed.length >= LINE_WIDTH) return text
            return " ".repeat(LINE_WIDTH - trimmed.length) + trimmed + "\n"
        }

        private fun formatTimestamp(millis: Long, language: String): String {
            val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .withLocale(if (language == "km") Locale("km", "KH") else Locale.US)
            return formatter.format(Instant.ofEpochMilli(millis))
        }

        private fun formatCurrency(minorUnits: Int, code: String): String {
            val amount = minorUnits.toDouble() / (if (code == "KHR") 1.0 else 100.0)
            val symbol = if (code == "KHR") "៛" else "$"
            val formatter = NumberFormat.getNumberInstance(Locale.US)
            if (code == "KHR") {
                formatter.maximumFractionDigits = 0
            } else {
                formatter.minimumFractionDigits = 2
                formatter.maximumFractionDigits = 2
            }
            return "$symbol${formatter.format(amount)}"
        }

        private fun getTranslation(path: String, lang: String): String {
            val bundle = if (lang == "km") KM_STRINGS else EN_STRINGS
            val parts = path.split(".")
            var current: Any? = bundle
            for (part in parts) {
                current = (current as? Map<*, *>)?.get(part)
            }
            return current as? String ?: path
        }

        private val EN_STRINGS = mapOf(
            "order_message" to mapOf(
                "cash_payment" to "Cash",
                "qr_payment" to "QR Code"
            ),
            "receipt" to mapOf(
                "title" to "Order Receipt",
                "void_title" to "VOID RECEIPT",
                "order_id" to "Order ID: {orderId}",
                "date" to "Date: {timestamp}",
                "staff_label" to "Staff",
                "total" to "Total: {total}",
                "payment_type" to "Payment Type: {paymentType}",
                "thank_you" to "Thank you!",
                "void_reason_label" to "Reason",
                "void_note_label" to "Note"
            )
        )

        private val KM_STRINGS = mapOf(
            "order_message" to mapOf(
                "cash_payment" to "សាច់ប្រាក់",
                "qr_payment" to "QR កូដ"
            ),
            "receipt" to mapOf(
                "title" to "វិក្កយបត្រកម្មង់",
                "void_title" to "វិក្កយបត្របោះបង់",
                "order_id" to "លេខសម្គាល់ការកម្មង់៖ {orderId}",
                "date" to "កាលបរិច្ឆេទ៖ {timestamp}",
                "staff_label" to "បុគ្គលិក",
                "total" to "សរុប៖ {total}",
                "payment_type" to "ប្រភេទការទូទាត់៖ {paymentType}",
                "thank_you" to "សូមអរគុណ!",
                "void_reason_label" to "មូលហេតុ",
                "void_note_label" to "កំណត់សំគាល់"
            )
        )
    }
}
