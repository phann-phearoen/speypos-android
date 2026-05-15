package com.speypos.shell

import android.graphics.*
import android.text.TextPaint
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

class ReceiptRenderer {
    companion object {
        private const val WIDTH_DOTS = 576 // 72mm * 8 dots/mm = 576 dots

        private const val FONT_SIZE_TITLE = 32f
        private const val FONT_SIZE_NORMAL = 24f
        private const val LINE_SPACING = 8

        fun renderOrder(
            order: JSONObject,
            variant: String = "INTERNAL",
            language: String = "en",
            currencyCode: String = "USD"
        ): ByteArray {
            val isVoided = variant == "VOID" || order.optString("status") == "voided"
            
            // 1. Calculate height needed
            val items = order.optJSONArray("items") ?: JSONArray()
            val itemMap = mutableMapOf<String, MutableList<JSONObject>>()
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                val name = item.optString("menu_item_name", "Unknown")
                itemMap.getOrPut(name) { mutableListOf() }.add(item)
            }
            
            // Estimate height (Title + OrderInfo + Items + Totals + Footer)
            var estimatedHeight = 150 // Header area
            itemMap.forEach { (_, variants) ->
                estimatedHeight += 40 // Item name
                estimatedHeight += variants.size * 35 // Variants
            }
            estimatedHeight += 150 // Totals + Footer + Feed
            
            // 2. Create Bitmap and Canvas
            val bitmap = Bitmap.createBitmap(WIDTH_DOTS, estimatedHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.WHITE)
            
            val paint = TextPaint().apply {
                color = Color.BLACK
                isAntiAlias = true
                typeface = Typeface.DEFAULT
            }
            
            var y = 40f

            // 3. Draw Content
            // Title
            paint.textSize = FONT_SIZE_TITLE
            paint.typeface = Typeface.DEFAULT_BOLD
            val title = if (isVoided) getTranslation("receipt.void_title", language) else getTranslation("receipt.title", language)
            drawCenteredText(canvas, title, y, paint)
            y += FONT_SIZE_TITLE + LINE_SPACING * 2
            
            // Order Info
            paint.textSize = FONT_SIZE_NORMAL
            paint.typeface = Typeface.DEFAULT
            val orderId = order.optString("id").split("-").lastOrNull()?.takeLast(6) ?: "N/A"
            canvas.drawText(getTranslation("receipt.order_id", language).replace("{orderId}", orderId), 0f, y, paint)
            y += FONT_SIZE_NORMAL + LINE_SPACING
            
            val timestamp = formatTimestamp(order.optLong(if (isVoided) "voided_at" else "created_at", System.currentTimeMillis()), language)
            canvas.drawText(getTranslation("receipt.date", language).replace("{timestamp}", timestamp), 0f, y, paint)
            y += FONT_SIZE_NORMAL + LINE_SPACING
            
            val staffName = order.optString("staff_name", "Unknown")
            canvas.drawText("${getTranslation("receipt.staff_label", language)}: $staffName", 0f, y, paint)
            y += FONT_SIZE_NORMAL + LINE_SPACING
            
            canvas.drawLine(0f, y, WIDTH_DOTS.toFloat(), y, paint)
            y += LINE_SPACING * 2

            // Items
            itemMap.forEach { (name, variants) ->
                paint.typeface = Typeface.DEFAULT_BOLD
                canvas.drawText("* $name", 0f, y, paint)
                y += FONT_SIZE_NORMAL + LINE_SPACING
                
                paint.typeface = Typeface.DEFAULT
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
                        canvas.drawText("  - ($detailCsv) $qtyText", 0f, y, paint)
                    } else {
                        canvas.drawText("  - $qtyText", 0f, y, paint)
                    }
                    y += FONT_SIZE_NORMAL + LINE_SPACING
                }
            }
            
            canvas.drawLine(0f, y, WIDTH_DOTS.toFloat(), y, paint)
            y += LINE_SPACING * 2

            // Totals
            if (isVoided) {
                canvas.drawText("${getTranslation("receipt.void_reason_label", language)}: ${order.optString("void_reason", "N/A")}", 0f, y, paint)
                y += FONT_SIZE_NORMAL + LINE_SPACING
                val note = order.optString("void_note", "")
                if (note.isNotBlank()) {
                    canvas.drawText("${getTranslation("receipt.void_note_label", language)}: $note", 0f, y, paint)
                    y += FONT_SIZE_NORMAL + LINE_SPACING
                }
            } else {
                val totalStr = getTranslation("receipt.total", language).replace("{total}", formatCurrency(order.optInt("total_amount", 0), currencyCode))
                val totalWidth = paint.measureText(totalStr)
                canvas.drawText(totalStr, WIDTH_DOTS - totalWidth, y, paint)
                y += FONT_SIZE_NORMAL + LINE_SPACING
                
                val payment = order.optJSONObject("payment")
                val pType = payment?.optString("payment_type", "cash") ?: "cash"
                val pLabel = getTranslation("order_message.${pType}_payment", language)
                canvas.drawText("${getTranslation("receipt.payment_type", language).replace("{paymentType}", pLabel)}", 0f, y, paint)
                y += FONT_SIZE_NORMAL + LINE_SPACING
            }
            
            y += LINE_SPACING * 2
            drawCenteredText(canvas, getTranslation("receipt.thank_you", language), y, paint)
            
            // 4. Crop Bitmap to actual content height
            val finalHeight = (y + 40).toInt().coerceAtMost(estimatedHeight)
            val cropped = Bitmap.createBitmap(bitmap, 0, 0, WIDTH_DOTS, finalHeight)
            
            // 5. Convert to ESC/POS Raster format
            return bitmapToEscPos(cropped)
        }

        private fun drawCenteredText(canvas: Canvas, text: String, y: Float, paint: Paint) {
            val width = paint.measureText(text)
            canvas.drawText(text, (WIDTH_DOTS - width) / 2, y, paint)
        }

        private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
            val width = bitmap.width
            val height = bitmap.height
            val widthBytes = (width + 7) / 8
            val bos = ByteArrayOutputStream()

            // ESC/POS GS v 0 command: Raster bit image
            // 1D 76 30 m xL xH yL yH d1...dk
            // m=0 (Normal mode)
            bos.write(0x1D)
            bos.write(0x76)
            bos.write(0x30)
            bos.write(0x00)
            bos.write(widthBytes % 256)
            bos.write(widthBytes / 256)
            bos.write(height % 256)
            bos.write(height / 256)

            for (y in 0 until height) {
                for (xByte in 0 until widthBytes) {
                    var byte = 0
                    for (bit in 0 until 8) {
                        val x = xByte * 8 + bit
                        if (x < width) {
                            val pixel = bitmap.getPixel(x, y)
                            val r = (pixel shr 16) and 0xff
                            val g = (pixel shr 8) and 0xff
                            val b = pixel and 0xff
                            val gray = (r + g + b) / 3
                            if (gray < 128) { // Black pixel
                                byte = byte or (1 shl (7 - bit))
                            }
                        }
                    }
                    bos.write(byte)
                }
            }
            
            // Add feed and cut
            bos.write(0x1D)
            bos.write(0x56)
            bos.write(0x41)
            bos.write(0x00)

            return bos.toByteArray()
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
            val formatter = java.text.NumberFormat.getNumberInstance(Locale.US)
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
