package com.speypos.shell

import android.webkit.JavascriptInterface
import java.time.Instant
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

    return "{\"data\":{" +
      "\"startupPhase\":\"$startupPhase\"," +
      "\"recoveryRunning\":false," +
      "\"degraded\":false," +
      "\"degradedReasons\":[]," +
      "\"lastRecoveryRun\":null," +
      "\"updatedAt\":\"$updatedAt\"}," +
      "\"error\":null}"
  }

  @JavascriptInterface
  fun getPendingActions(): String {
    val startupPhase = runtimeState.startupPhase
    val healthState = when (startupPhase) {
      "recovering", "loading_frontend" -> "recovering"
      "frontend_error", "frontend_timeout" -> "degraded"
      else -> "healthy"
    }
    val degradedReasons = when (startupPhase) {
      "frontend_error" -> "[\"frontend_error\"]"
      "frontend_timeout" -> "[\"frontend_timeout\"]"
      else -> "[]"
    }

    return "{\"data\":{" +
      "\"hasUnprintedOrders\":false," +
      "\"unprintedOrdersCount\":0," +
      "\"hasUnreportedOrders\":false," +
      "\"unreportedOrdersCount\":0," +
      "\"hasUnreportedShifts\":false," +
      "\"unreportedShiftsCount\":0," +
      "\"isDegraded\":${healthState == \"degraded\"}," +
      "\"healthState\":\"$healthState\"," +
      "\"degradedReasons\":$degradedReasons," +
      "\"recoveryRunning\":false," +
      "\"startupPhase\":\"$startupPhase\"}," +
      "\"error\":null}"
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