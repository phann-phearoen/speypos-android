package com.speypos.shell

import android.webkit.JavascriptInterface
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

class SpeyposNativeBridge(
  private val configStore: NativeConfigStore,
  private val runtimeState: NativeRuntimeState,
) {
  @JavascriptInterface
  fun getOrders(): String {
    return JSONObject()
      .put("data", configStore.readOrders())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun createOrder(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.createOrder(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to create order")
        .toString()
    }
  }

  @JavascriptInterface
  fun payOrder(orderId: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.payOrder(orderId, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to pay order")
        .toString()
    }
  }

  @JavascriptInterface
  fun voidOrder(orderId: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.voidOrder(orderId, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to void order")
        .toString()
    }
  }

  @JavascriptInterface
  fun printReceipt(orderId: String, mode: String): String {
    return try {
      JSONObject()
        .put("data", configStore.printReceipt(orderId, mode))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to print receipt")
        .toString()
    }
  }

  @JavascriptInterface
  fun getPrintQueueStatus(): String {
    return JSONObject()
      .put("data", configStore.getPrintQueueStatus())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun triggerPrintQueueRetry(): String {
    return try {
      JSONObject()
        .put("data", configStore.processPrintQueue("bridge_manual", 50))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to trigger print queue retry")
        .toString()
    }
  }

  @JavascriptInterface
  fun getStaff(): String {
    return JSONObject()
      .put("data", configStore.readStaff())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun createStaff(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.createStaff(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to create staff")
        .toString()
    }
  }

  @JavascriptInterface
  fun updateStaff(staffId: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.updateStaff(staffId, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to update staff")
        .toString()
    }
  }

  @JavascriptInterface
  fun deleteStaff(staffId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.deleteStaff(staffId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to delete staff")
        .toString()
    }
  }

  @JavascriptInterface
  fun openShift(staffId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.openShift(staffId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to open shift")
        .toString()
    }
  }

  @JavascriptInterface
  fun closeShift(shiftId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.closeShift(shiftId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to close shift")
        .toString()
    }
  }

  @JavascriptInterface
  fun closeDay(): String {
    return try {
      JSONObject()
        .put("data", configStore.closeDay())
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to close day")
        .toString()
    }
  }

  @JavascriptInterface
  fun getShifts(): String {
    return JSONObject()
      .put("data", configStore.readShifts())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuItemCustomizationMappings(): String {
    return JSONObject()
      .put("data", configStore.readMenuItemCustomizationMappings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuCategoryCustomizationMappings(): String {
    return JSONObject()
      .put("data", configStore.readMenuCategoryCustomizationMappings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuItemToppingMappings(): String {
    return JSONObject()
      .put("data", configStore.readMenuItemToppingMappings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuCategoryToppingMappings(): String {
    return JSONObject()
      .put("data", configStore.readMenuCategoryToppingMappings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getCustomizationGroups(): String {
    return JSONObject()
      .put("data", configStore.readCustomizationGroups())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getCustomizationOptions(): String {
    return JSONObject()
      .put("data", configStore.readCustomizationOptions())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getToppingGroups(): String {
    return JSONObject()
      .put("data", configStore.readToppingGroups())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getToppingOptions(): String {
    return JSONObject()
      .put("data", configStore.readToppingOptions())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuCategories(): String {
    return JSONObject()
      .put("data", configStore.readMenuCategories())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getMenuItems(): String {
    return JSONObject()
      .put("data", configStore.readMenuItems())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getSetupStatus(): String {
    return "{\"data\":{\"initialized\":${configStore.isSystemInitialized()}},\"error\":null}"
  }

  @JavascriptInterface
  fun getRuntimeStatus(): String {
    val startupPhase = runtimeState.startupPhase
    val updatedAt = Instant.now().toString()
    val queueStatus = configStore.getPrintQueueStatus()
    val deadLetterJobs = queueStatus.optInt("dead_letter_jobs", 0)
    val degradedFromStartup = startupPhase == "frontend_error" || startupPhase == "frontend_timeout"
    val degraded = degradedFromStartup || deadLetterJobs > 0

    val degradedReasons = JSONArray().apply {
      if (startupPhase == "frontend_error") put("frontend_error")
      if (startupPhase == "frontend_timeout") put("frontend_timeout")
      if (deadLetterJobs > 0) put("print_queue_dead_letter")
    }

    return JSONObject()
      .put("data", JSONObject()
        .put("startupPhase", startupPhase)
        .put("recoveryRunning", false)
        .put("degraded", degraded)
        .put("degradedReasons", degradedReasons)
        .put("lastRecoveryRun", JSONObject.NULL)
        .put("printQueue", queueStatus)
        .put("updatedAt", updatedAt)
      )
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getPendingActions(): String {
    val startupPhase = runtimeState.startupPhase
    val queueStatus = configStore.getPrintQueueStatus()
    val pendingPrintJobs =
      queueStatus.optInt("pending_jobs", 0) + queueStatus.optInt("retrying_jobs", 0) + queueStatus.optInt("dead_letter_jobs", 0)
    val healthState = when {
      queueStatus.optInt("dead_letter_jobs", 0) > 0 -> "degraded"
      startupPhase == "recovering" || startupPhase == "loading_frontend" -> "recovering"
      startupPhase == "frontend_error" || startupPhase == "frontend_timeout" -> "degraded"
      else -> "healthy"
    }

    val degradedReasons = JSONArray().apply {
      if (startupPhase == "frontend_error") put("frontend_error")
      if (startupPhase == "frontend_timeout") put("frontend_timeout")
      if (queueStatus.optInt("dead_letter_jobs", 0) > 0) put("print_queue_dead_letter")
    }

    return JSONObject()
      .put("data", JSONObject()
        .put("hasUnprintedOrders", pendingPrintJobs > 0)
        .put("unprintedOrdersCount", pendingPrintJobs)
        .put("printerPending", queueStatus)
        .put("hasUnreportedOrders", false)
        .put("unreportedOrdersCount", 0)
        .put("hasUnreportedShifts", false)
        .put("unreportedShiftsCount", 0)
        .put("isDegraded", healthState == "degraded")
        .put("healthState", healthState)
        .put("degradedReasons", degradedReasons)
        .put("recoveryRunning", false)
        .put("startupPhase", startupPhase)
      )
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getAllSettings(): String {
    return JSONObject()
      .put("data", configStore.readSettings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getStore(): String {
    return JSONObject()
      .put("data", configStore.readStore())
      .put("error", JSONObject.NULL)
      .toString()
  }
}