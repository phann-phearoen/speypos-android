package com.speypos.shell

import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

class TelegramFormatter {
    companion object {
        fun formatOrderMessage(
            order: JSONObject,
            isRetry: Boolean,
            language: String,
            currencyCode: String
        ): String {
            val isVoid = order.optString("status") == "voided"
            val titleKey = if (isVoid) "void_message.title" else "order_message.title"
            val indicator = if (isRetry) getTranslation("retried_indicator", language) else ""
            
            val sb = StringBuilder()
            
            // Title
            val orderId = order.optString("id").split("-").lastOrNull()?.takeLast(6) ?: "N/A"
            sb.append(getTranslation(titleKey, language).replace("{orderId}", orderId))
            sb.append(indicator).append("\n\n")

            // Time
            val timestamp = if (isVoid) order.optLong("voided_at") else order.optLong("created_at")
            val timeStr = formatTime(timestamp, language)
            val timeLabel = if (isVoid) "void_message.time" else "order_message.time"
            sb.append(getTranslation(timeLabel, language).replace("{time}", timeStr)).append("\n")

            // Staff
            val staffName = order.optString("staff_name", "Unknown")
            val staffLabel = if (isVoid) "void_message.staff" else "order_message.staff"
            sb.append(getTranslation(staffLabel, language).replace("{staffName}", staffName)).append("\n")

            if (isVoid) {
                val reason = order.optString("void_reason", "other")
                val reasonLabel = getTranslation("void_message.reasons.$reason", language)
                sb.append(getTranslation("void_message.reason", language).replace("{reason}", reasonLabel)).append("\n")
                
                val note = order.optString("void_note", "")
                if (note.isNotBlank()) {
                    sb.append(getTranslation("void_message.note", language).replace("{note}", note)).append("\n")
                }
            } else {
                sb.append("\n").append(getTranslation("order_message.items", language)).append("\n\n")
                
                // Items grouping logic
                val items = order.optJSONArray("items") ?: JSONArray()
                val itemMap = mutableMapOf<String, MutableList<JSONObject>>()
                
                for (i in 0 until items.length()) {
                    val item = items.optJSONObject(i) ?: continue
                    val name = item.optString("menu_item_name", "Unknown")
                    itemMap.getOrPut(name) { mutableListOf() }.add(item)
                }

                itemMap.forEach { (name, variants) ->
                    sb.append("*").append(name).append("*\n")
                    
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
                        if (detailCsv.isNotBlank()) {
                            sb.append("- ($detailCsv) x ${v.optInt("quantity", 1)}\n")
                        } else {
                            sb.append("- x ${v.optInt("quantity", 1)}\n")
                        }
                    }
                    sb.append("\n")
                }

                val total = formatCurrency(order.optInt("total_amount", 0), currencyCode)
                sb.append(getTranslation("order_message.total", language).replace("{totalAmount}", total)).append("\n")
                
                val payment = order.optJSONObject("payment")
                val pType = payment?.optString("payment_type", "cash") ?: "cash"
                val pLabel = getTranslation("order_message.${pType}_payment", language)
                sb.append(getTranslation("order_message.payment", language).replace("{paymentType}", pLabel)).append("\n")
            }

            return sb.toString()
        }

        fun formatShiftCloseMessage(
            shift: JSONObject,
            isRetry: Boolean,
            language: String,
            currencyCode: String
        ): String {
            val indicator = if (isRetry) getTranslation("retried_indicator", language) else ""
            val sb = StringBuilder()
            
            sb.append(getTranslation("shift_close_message.title", language).replace("{date}", shift.optString("date")))
            sb.append(indicator).append("\n\n")
            
            val start = formatTime(shift.optLong("started_at"), language)
            val end = formatTime(shift.optLong("ended_at"), language)
            sb.append(getTranslation("shift_close_message.duration", language)
                .replace("{startTime}", start)
                .replace("{endTime}", end)).append("\n\n")

            // Stats from a summary or manually computed
            // Assuming the payload provided to us includes these summary stats for convenience
            val summary = shift.optJSONObject("summary") ?: JSONObject()
            
            sb.append(getTranslation("shift_close_message.total_orders", language)
                .replace("{totalOrders}", summary.optInt("total_orders", 0).toString())).append("\n")
            sb.append(getTranslation("shift_close_message.total_items_sold", language)
                .replace("{totalItems}", summary.optInt("total_items", 0).toString())).append("\n")

            val voidedCount = summary.optInt("voided_orders", 0)
            if (voidedCount > 0) {
                sb.append("\n")
                sb.append(getTranslation("shift_close_message.voided_orders", language).replace("{count}", voidedCount.toString())).append("\n")
                sb.append(getTranslation("shift_close_message.voided_items", language).replace("{voidedItems}", summary.optInt("voided_items", 0).toString())).append("\n")
                sb.append(getTranslation("shift_close_message.voided_amount", language).replace("{amount}", formatCurrency(summary.optInt("voided_amount", 0), currencyCode))).append("\n")
            }

            sb.append("\n").append(getTranslation("shift_close_message.revenue_by_payment_type", language)).append("\n")
            val pBreakdown = summary.optJSONObject("payment_breakdown") ?: JSONObject()
            val pKeys = pBreakdown.keys()
            while (pKeys.hasNext()) {
                val pk = pKeys.next()
                val pLabel = getTranslation("shift_close_message.${pk}_payment", language)
                sb.append(getTranslation("shift_close_message.revenue_line", language)
                    .replace("{type}", pLabel)
                    .replace("{amount}", formatCurrency(pBreakdown.optInt(pk), currencyCode))).append("\n")
            }

            sb.append("\n").append(getTranslation("shift_close_message.total_revenue", language)
                .replace("{totalRevenue}", formatCurrency(summary.optInt("total_revenue", 0), currencyCode)))

            return sb.toString()
        }

        fun formatDayCloseMessage(
            daySummary: JSONObject,
            language: String,
            currencyCode: String
        ): String {
            val sb = StringBuilder()
            
            // Intro
            sb.append("*").append(getTranslation("day_close_summary.title", language)).append("*\n\n")
            sb.append("_").append(getTranslation("day_close_summary.business_date", language).replace("{date}", daySummary.optString("date"))).append("_\n\n")

            // Per shift
            val shifts = daySummary.optJSONArray("shifts") ?: JSONArray()
            for (i in 0 until shifts.length()) {
                val s = shifts.optJSONObject(i) ?: continue
                val summary = s.optJSONObject("summary") ?: JSONObject()
                
                sb.append("*").append(getTranslation("day_close_summary.shift_section_header", language).replace("{shiftNumber}", (i + 1).toString())).append("*\n")
                sb.append(getTranslation("day_close_summary.total_orders", language).replace("{count}", summary.optInt("total_orders").toString())).append("\n")
                sb.append(getTranslation("day_close_summary.total_items_sold", language).replace("{totalItemsSold}", summary.optInt("total_items").toString())).append("\n")
                sb.append(getTranslation("day_close_summary.total_revenue", language).replace("{amount}", formatCurrency(summary.optInt("total_revenue"), currencyCode))).append("\n")
                
                val voided = summary.optInt("voided_orders", 0)
                if (voided > 0) {
                    sb.append("\n")
                    sb.append(getTranslation("day_close_summary.voided_orders", language).replace("{count}", voided.toString())).append("\n")
                    sb.append(getTranslation("day_close_summary.voided_items", language).replace("{count}", summary.optInt("voided_items").toString())).append("\n")
                    sb.append(getTranslation("day_close_summary.voided_amount", language).replace("{amount}", formatCurrency(summary.optInt("voided_amount"), currencyCode))).append("\n")
                }
                
                val pBreakdown = summary.optJSONObject("payment_breakdown")
                if (pBreakdown != null && pBreakdown.length() > 0) {
                    sb.append("\n").append(getTranslation("day_close_summary.payment_breakdown", language)).append("\n")
                    val keys = pBreakdown.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        sb.append(getTranslation("day_close_summary.payment_line", language)
                            .replace("{type}", k) // Shift level labels not remapped per spec
                            .replace("{amount}", formatCurrency(pBreakdown.optInt(k), currencyCode))).append("\n")
                    }
                }
                sb.append("\n\n")
            }

            // Combined
            sb.append("\n*").append(getTranslation("day_close_summary.combined_section_header", language)).append("*\n")
            sb.append(getTranslation("day_close_summary.total_orders", language).replace("{count}", daySummary.optInt("total_orders").toString())).append("\n")
            sb.append(getTranslation("day_close_summary.grand_total_items_sold", language).replace("{grandTotalItemsSold}", daySummary.optInt("total_items").toString())).append("\n")
            sb.append(getTranslation("day_close_summary.grand_total_revenue", language).replace("{amount}", formatCurrency(daySummary.optInt("total_revenue"), currencyCode))).append("\n")

            val combinedVoided = daySummary.optInt("voided_orders", 0)
            if (combinedVoided > 0) {
                sb.append("\n")
                sb.append(getTranslation("day_close_summary.voided_orders", language).replace("{count}", combinedVoided.toString())).append("\n")
                sb.append(getTranslation("day_close_summary.voided_items", language).replace("{count}", daySummary.optInt("voided_items").toString())).append("\n")
                sb.append(getTranslation("day_close_summary.voided_amount", language).replace("{amount}", formatCurrency(daySummary.optInt("voided_amount"), currencyCode))).append("\n")
            }

            val combinedP = daySummary.optJSONObject("payment_breakdown")
            if (combinedP != null && combinedP.length() > 0) {
                sb.append("\n").append(getTranslation("day_close_summary.payment_breakdown", language)).append("\n")
                val keys = combinedP.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val pLabel = getTranslation("day_close_summary.${k}_payment", language)
                    sb.append(getTranslation("day_close_summary.payment_line", language)
                        .replace("{type}", pLabel)
                        .replace("{amount}", formatCurrency(combinedP.optInt(k), currencyCode))).append("\n")
                }
            }

            sb.append("\n*").append(getTranslation("day_close_summary.conclusion", language)).append("*")

            return sb.toString()
        }

        private fun formatTime(millis: Long, language: String): String {
            if (millis <= 0) return "-"
            val formatter = DateTimeFormatter.ofPattern("HH:mm")
                .withZone(ZoneId.systemDefault())
            return formatter.format(Instant.ofEpochMilli(millis))
        }

        private fun formatCurrency(minorUnits: Int, code: String): String {
            val amount = minorUnits.toDouble() / (if (code == "KHR") 1.0 else 100.0)
            val format = NumberFormat.getCurrencyInstance(Locale.US)
            format.currency = Currency.getInstance(code)
            if (code == "KHR") {
                format.maximumFractionDigits = 0
            }
            return format.format(amount).replace("KHR", "៛")
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
            "retried_indicator" to " (Retried)",
            "order_message" to mapOf(
                "title" to "📦 New Order: #{orderId}",
                "time" to "Time: {time}",
                "staff" to "Staff: {staffName}",
                "items" to "Items:",
                "total" to "💰 Total: {totalAmount}",
                "payment" to "💳 Payment: {paymentType}",
                "cash_payment" to "Cash",
                "qr_payment" to "QR Code"
            ),
            "void_message" to mapOf(
                "title" to "❌ Order Voided: #{orderId}",
                "time" to "Time: {time}",
                "staff" to "Staff: {staffName}",
                "reason" to "Reason: {reason}",
                "note" to "Note: {note}",
                "reasons" to mapOf(
                    "mistake" to "Mistake",
                    "staff_consumption" to "Staff consumption",
                    "other" to "Other"
                )
            ),
            "shift_close_message" to mapOf(
                "title" to "🔒 Shift Closed: {date}",
                "duration" to "Duration: {startTime} - {endTime}",
                "total_orders" to "Total Orders: {totalOrders}",
                "total_items_sold" to "Total Items Sold: {totalItems}",
                "revenue_by_payment_type" to "Revenue by Payment Type:",
                "voided_orders" to "Voided Orders: {count}",
                "voided_items" to "Voided Items: {voidedItems}",
                "voided_amount" to "Voided Amount: {amount}",
                "revenue_line" to "- {type}: {amount}",
                "total_revenue" to "Total Revenue: {totalRevenue}",
                "cash_payment" to "Cash",
                "qr_payment" to "QR Code"
            )
        )

        private val KM_STRINGS = mapOf(
            "retried_indicator" to " (ផ្ញើរឡើងវិញ)",
            "order_message" to mapOf(
                "title" to "📦 ទទួលការកម្មង់៖ #{orderId}",
                "time" to "ម៉ោង៖ {time}",
                "staff" to "បុគ្គលិក៖ {staffName}",
                "items" to "ទំនិញ៖",
                "total" to "💰 សរុប៖ {totalAmount}",
                "payment" to "💳 វិធីទូទាត់៖ {paymentType}",
                "cash_payment" to "សាច់ប្រាក់",
                "qr_payment" to "QR កូដ"
            ),
            "void_message" to mapOf(
                "title" to "❌ បោះបង់ការកម្មង់ #{orderId}",
                "time" to "ម៉ោង៖ {time}",
                "staff" to "បុគ្គលិក៖ {staffName}",
                "reason" to "មូលហេតុ៖ {reason}",
                "note" to "កំណត់សំគាល់៖ {note}",
                "reasons" to mapOf(
                    "mistake" to "កំហុស",
                    "staff_consumption" to "បុគ្គលិកប្រើប្រាស់",
                    "other" to "ផ្សេងៗ"
                )
            ),
            "shift_close_message" to mapOf(
                "title" to "🔒 បិទវេន៖ {date}",
                "duration" to "រយៈពេល៖ {startTime} - {endTime}",
                "total_orders" to "ចំនួនការកម្មង់៖ {totalOrders}",
                "total_items_sold" to "ទំនិញដែលបានលក់សរុប៖ {totalItems}",
                "revenue_by_payment_type" to "ចំណូលតាមប្រភេទការទូទាត់៖",
                "voided_orders" to "ការកម្មង់ដែលបានបោះបង់៖ {count}",
                "voided_items" to "ទំនិញដែលបានបោះបង់៖ {voidedItems}",
                "voided_amount" to "ចំណូលបានបោះបង់៖ {amount}",
                "revenue_line" to "- {type}: {amount}",
                "total_revenue" to "ចំណូលសរុប៖ {totalRevenue}",
                "cash_payment" to "សាច់ប្រាក់",
                "qr_payment" to "QR កូដ"
            )
        )
    }
}
