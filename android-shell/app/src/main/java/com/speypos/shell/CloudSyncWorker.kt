package com.speypos.shell

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

class CloudSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val store = NativeConfigStore(appContext)

    override suspend fun doWork(): Result {
        val queue = store.readSyncQueue()
        if (queue.length() == 0) return Result.success()

        var hasFailure = false
        val now = OffsetDateTime.now()

        for (i in 0 until queue.length()) {
            val job = queue.optJSONObject(i) ?: continue
            val jobId = job.optString("id")
            val nextAttemptAtStr = job.optString("next_attempt_at")
            val nextAttemptAt = OffsetDateTime.parse(nextAttemptAtStr)
            
            if (nextAttemptAt.isAfter(now)) {
                continue
            }

            try {
                Log.i("CloudSyncWorker", "Processing job $jobId (${i + 1}/${queue.length()})")
                processJob(job)
                // Remove successful job
                removeJobFromQueue(jobId)
                Log.i("CloudSyncWorker", "Job $jobId succeeded")
            } catch (e: Exception) {
                Log.e("CloudSyncWorker", "Job $jobId failed: ${e.message}")
                updateJobFailure(job)
                hasFailure = true
                break // Sequential processing: halt on first failure
            }
        }

        return if (hasFailure) Result.retry() else Result.success()
    }

    private fun processJob(job: JSONObject) {
        val type = job.optString("type")
        val shiftId = job.optString("shiftId")
        val cloudSettings = store.readCloudSyncSettings()
        
        
        if (!cloudSettings.optBoolean("enabled", false)) {
            Log.w("CloudSyncWorker", "Skipping job: Cloud sync is disabled in settings")
            return
        }

        val storeId = cloudSettings.optString("store_id")
        if (storeId.isBlank()) {
            throw Exception("Cloud Store ID is missing. Handshake required.")
        }

        val limit = cloudSettings.optInt("mini_batch_size", 20)
        
        if (type == "orders_shift_mini_batch") {
            syncMiniBatch(shiftId, limit)
        } else if (type == "orders_shift_flush") {
            syncFlush(shiftId, limit)
        }
    }

    private fun syncMiniBatch(shiftId: String, limit: Int) {
        val orders = store.getUnsyncedOrders(shiftId, limit)
        if (orders.isEmpty()) {
            return
        }

        Log.i("CloudSyncWorker", "Starting mini-batch sync for ${orders.size} orders")
        val batchId = store.createCloudEventBatch(shiftId, "manual")
        uploadOrders(batchId, orders)
    }

    private fun syncFlush(shiftId: String, limit: Int) {
        Log.i("CloudSyncWorker", "Starting full flush for shift $shiftId")
        var totalUploaded = 0
        while (true) {
            val orders = store.getUnsyncedOrders(shiftId, limit)
            if (orders.isEmpty()) {
                break
            }

            val batchId = store.createCloudEventBatch(shiftId, "shift_close")
            uploadOrders(batchId, orders)
            totalUploaded += orders.size
            
            // Safety break to prevent infinite loop if marking as synced fails
            if (totalUploaded > 10000) { 
                Log.e("CloudSyncWorker", "Flush exceeded safety limit of 10000 orders. Potential infinite loop.")
                break 
            }
        }
        Log.i("CloudSyncWorker", "Finished flush for shift $shiftId. Total uploaded in this job: $totalUploaded")
    }

    private fun uploadOrders(batchId: String, orders: List<JSONObject>) {
        val storeInfo = store.readStore()
        val currency = storeInfo.optString("currency", "USD")

        for (order in orders) {
            val orderId = order.optString("id")
            try {
                val event = formatOrderEvent(order, currency)
                store.uploadCloudEvent(batchId, event)
                store.markOrderAsSynced(orderId)
            } catch (e: Exception) {
                Log.e("CloudSyncWorker", "Failed to upload order $orderId: ${e.message}")
                throw e // Propagate to processJob to trigger retry/backoff
            }
        }
    }

    private fun formatOrderEvent(order: JSONObject, currency: String): JSONObject {
        val minorUnit = if (currency == "KHR") 0 else 2
        val divisor = Math.pow(10.0, minorUnit.toDouble())

        val payload = JSONObject()
            .put("id", order.optString("id"))
            .put("shift_id", order.optString("shift_id"))
            .put("staff_id", order.optString("staff_id"))
            .put("status", order.optString("status"))
            .put("total", order.optInt("total_amount") / divisor)
            .put("total_items", order.optInt("total_items"))
            .put("currency", currency)
            .put("void_reason", order.opt("void_reason") ?: JSONObject.NULL)
            .put("void_note", order.opt("void_note") ?: JSONObject.NULL)
            .put("voided_at", formatIso(order.optLong("voided_at")))
            .put("voided_by", order.opt("voided_by") ?: JSONObject.NULL)

        val items = JSONArray()
        val sourceItems = order.optJSONArray("items") ?: JSONArray()
        for (i in 0 until sourceItems.length()) {
            val item = sourceItems.optJSONObject(i) ?: continue
            val price = item.optInt("unit_price") / divisor
            val qty = item.optInt("quantity", 1)
            
            val itemObj = JSONObject()
                .put("id", item.optString("id"))
                .put("menu_item_id", item.optString("menu_item_id"))
                .put("name", item.optString("menu_item_name"))
                .put("quantity", qty)
                .put("unit_price", price)
                .put("total_price", price * qty)
            
            val customs = JSONArray()
            val sourceCustoms = item.optJSONArray("customizations") ?: JSONArray()
            for (j in 0 until sourceCustoms.length()) {
                val c = sourceCustoms.optJSONObject(j) ?: continue
                customs.put(JSONObject()
                    .put("id", c.optString("id"))
                    .put("name", c.optString("name"))
                    .put("option_type", "choice") // Placeholder
                    .put("value", c.optString("value"))
                    .put("price", c.optInt("price") / divisor))
            }
            itemObj.put("customizations", customs)

            val toppings = JSONArray()
            val sourceToppings = item.optJSONArray("toppings") ?: JSONArray()
            for (j in 0 until sourceToppings.length()) {
                val t = sourceToppings.optJSONObject(j) ?: continue
                val tPrice = t.optInt("unit_price") / divisor
                val tQty = t.optDouble("quantity", 1.0)
                toppings.put(JSONObject()
                    .put("id", t.optString("id"))
                    .put("topping_option_id", t.optString("topping_option_id"))
                    .put("name", t.optString("name"))
                    .put("unit_label", t.optString("unit_label"))
                    .put("unit_price", tPrice)
                    .put("quantity", tQty)
                    .put("total_price", tPrice * tQty))
            }
            itemObj.put("toppings", toppings)
            
            items.put(itemObj)
        }
        payload.put("items", items)

        val payments = JSONArray()
        val payment = order.optJSONObject("payment")
        if (payment != null) {
            payments.put(JSONObject()
                .put("id", UUID.randomUUID().toString()) // Native records don't have separate payment IDs often
                .put("status", "paid")
                .put("payment_type", payment.optString("payment_type"))
                .put("amount", payment.optInt("amount") / divisor)
                .put("received_cash", if (payment.has("received_cash")) payment.optInt("received_cash") / divisor else JSONObject.NULL)
                .put("change", if (payment.has("change")) payment.optInt("change") / divisor else JSONObject.NULL)
                .put("created_at", formatIso(order.optLong("paid_at"))))
        }
        payload.put("payments", payments)

        return JSONObject()
            .put("event_type", "ORDER_CREATED")
            .put("occurred_at", formatIso(order.optLong("created_at")))
            .put("payload", payload)
    }

    private fun formatIso(millis: Long): Any {
        if (millis <= 0) return JSONObject.NULL
        return DateTimeFormatter.ISO_OFFSET_DATE_TIME
            .format(OffsetDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault()))
    }

    private fun removeJobFromQueue(jobId: String) {
        val queue = store.readSyncQueue()
        val updated = JSONArray()
        for (i in 0 until queue.length()) {
            val job = queue.optJSONObject(i) ?: continue
            if (job.optString("id") != jobId) updated.put(job)
        }
        store.persistSyncQueue(updated)
    }

    private fun updateJobFailure(failedJob: JSONObject) {
        val queue = store.readSyncQueue()
        for (i in 0 until queue.length()) {
            val job = queue.optJSONObject(i) ?: continue
            if (job.optString("id") == failedJob.optString("id")) {
                val retryCount = job.optInt("retry_count", 0) + 1
                val delayMs = Math.min(5000L * Math.pow(2.0, (retryCount - 1).toDouble()), 60000.0).toLong()
                
                job.put("retry_count", retryCount)
                job.put("last_attempt_at", OffsetDateTime.now().toString())
                job.put("next_attempt_at", OffsetDateTime.now().plusNanos(delayMs * 1_000_000L).toString())
                break
            }
        }
        store.persistSyncQueue(queue)
    }
}
