package com.speypos.shell

import android.webkit.JavascriptInterface
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

class SpeyposNativeBridge(
  private val configStore: NativeConfigStore,
  private val runtimeState: NativeRuntimeState,
) {
  init {
    android.util.Log.i("SpeyposNativeBridge", "Native Bridge initialized")
  }
  @JavascriptInterface
  fun initialize(payloadJson: String): String {
    return try {
      val result = configStore.initialize(JSONObject(payloadJson))
      
      // Auto-reload frontend to transition from Setup to POS
      runtimeState.emitAction(ShellAction.RELOAD_FRONTEND)
      
      JSONObject()
        .put("data", result)
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to initialize system")
        .toString()
    }
  }

  @JavascriptInterface
  fun restartApp(): String {
    return try {
      runtimeState.emitAction(ShellAction.RELOAD_FRONTEND)
      JSONObject().put("success", true).toString()
    } catch (e: Exception) {
      JSONObject().put("success", false).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun hardRestart(): String {
    return try {
      runtimeState.emitAction(ShellAction.RECREATE_ACTIVITY)
      JSONObject().put("success", true).toString()
    } catch (e: Exception) {
      JSONObject().put("success", false).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun login(payloadJson: String): String {
    return try {
      val payload = JSONObject(payloadJson)
      val name = payload.optString("name")
      val password = payload.optString("password")
      val staff = configStore.verifyStaffCredentials(name, password)

      if (staff != null) {
        JSONObject()
          .put("data", staff)
          .put("error", JSONObject.NULL)
          .toString()
      } else {
        JSONObject()
          .put("data", JSONObject.NULL)
          .put("error", "Invalid credentials")
          .toString()
      }
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Login failed")
        .toString()
    }
  }

  @JavascriptInterface
  fun resetAllData(): String {
    return try {
      configStore.resetAllData()
      JSONObject().put("success", true).toString()
    } catch (e: Exception) {
      JSONObject().put("success", false).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun getOrders(limit: Int): String {
    val orders = configStore.readOrders(limit)
    return JSONObject()
      .put("data", orders)
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getAllOrders(): String {
    val orders = configStore.readOrders(-1)
    return JSONObject()
      .put("data", orders)
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
  fun getDeadLetterDetails(): String {
    return try {
      JSONObject()
        .put("data", configStore.getDeadLetterDetails())
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to get dead letter details")
        .toString()
    }
  }

  @JavascriptInterface
  fun purgeDeadLetters(): String {
    return try {
      JSONObject()
        .put("data", configStore.purgeDeadLetters())
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to purge dead letters")
        .toString()
    }
  }

  @JavascriptInterface
  fun forceRetryAction(actionId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.forceRetryAction(actionId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to force retry action")
        .toString()
    }
  }

  @JavascriptInterface
  fun triggerPendingActionsRetry(): String {
    return try {
      JSONObject()
        .put("data", configStore.processPendingActions("bridge_manual", 50))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to trigger pending actions retry")
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
  fun createMenuItem(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.createMenuItem(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun updateMenuItem(itemId: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.updateMenuItem(itemId, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun deleteMenuItem(itemId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.deleteMenuItem(itemId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun createMenuCategory(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.createMenuCategory(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun updateMenuCategory(categoryId: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.updateMenuCategory(categoryId, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun deleteMenuCategory(categoryId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.deleteMenuCategory(categoryId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun createMenuItemCategoryMapping(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.createMenuItemCategoryMapping(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun deleteMenuItemCategoryMapping(mappingId: String): String {
    return try {
      JSONObject()
        .put("data", configStore.deleteMenuItemCategoryMapping(mappingId))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun getMenuItemCategoryMappings(): String {
    return JSONObject()
      .put("data", configStore.readMenuItemCategoryMappings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  // Customization CRUD
  @JavascriptInterface
  fun createCustomizationGroup(payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.createCustomizationGroup(JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun updateCustomizationGroup(id: String, payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.updateCustomizationGroup(id, JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteCustomizationGroup(id: String): String {
    return try {
      JSONObject().put("data", configStore.deleteCustomizationGroup(id)).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun createCustomizationOption(payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.createCustomizationOption(JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun updateCustomizationOption(id: String, payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.updateCustomizationOption(id, JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteCustomizationOption(id: String): String {
    return try {
      JSONObject().put("data", configStore.deleteCustomizationOption(id)).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }

  // Topping CRUD
  @JavascriptInterface
  fun createToppingGroup(payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.createToppingGroup(JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun updateToppingGroup(id: String, payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.updateToppingGroup(id, JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteToppingGroup(id: String): String {
    return try {
      JSONObject().put("data", configStore.deleteToppingGroup(id)).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun createToppingOption(payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.createToppingOption(JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun updateToppingOption(id: String, payloadJson: String): String {
    return try {
      JSONObject().put("data", configStore.updateToppingOption(id, JSONObject(payloadJson))).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteToppingOption(id: String): String {
    return try {
      JSONObject().put("data", configStore.deleteToppingOption(id)).put("error", JSONObject.NULL).toString()
    } catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }

  // Mapping CRUD (Customization & Toppings)
  @JavascriptInterface
  fun createMenuItemCustomizationMapping(p: String): String {
    return try { JSONObject().put("data", configStore.createMenuItemCustomizationMapping(JSONObject(p))).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteMenuItemCustomizationMapping(id: String): String {
    return try { JSONObject().put("data", configStore.deleteMenuItemCustomizationMapping(id)).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun createMenuCategoryCustomizationMapping(p: String): String {
    return try { JSONObject().put("data", configStore.createMenuCategoryCustomizationMapping(JSONObject(p))).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteMenuCategoryCustomizationMapping(id: String): String {
    return try { JSONObject().put("data", configStore.deleteMenuCategoryCustomizationMapping(id)).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun createMenuItemToppingMapping(p: String): String {
    return try { JSONObject().put("data", configStore.createMenuItemToppingMapping(JSONObject(p))).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteMenuItemToppingMapping(id: String): String {
    return try { JSONObject().put("data", configStore.deleteMenuItemToppingMapping(id)).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun createMenuCategoryToppingMapping(p: String): String {
    return try { JSONObject().put("data", configStore.createMenuCategoryToppingMapping(JSONObject(p))).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
  }
  @JavascriptInterface
  fun deleteMenuCategoryToppingMapping(id: String): String {
    return try { JSONObject().put("data", configStore.deleteMenuCategoryToppingMapping(id)).put("error", JSONObject.NULL).toString() }
    catch (e: Exception) { JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString() }
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
    val actionsStatus = configStore.getPendingActionsStatus()
    
    val deadLetterJobs = queueStatus.optInt("dead_letter_jobs", 0)
    val deadLetterActions = actionsStatus.optInt("dead_letter_actions", 0)
    
    val degradedFromStartup = startupPhase == "frontend_error" || startupPhase == "frontend_timeout"
    val degraded = degradedFromStartup || deadLetterJobs > 0 || deadLetterActions > 0

    val degradedReasons = JSONArray().apply {
      if (startupPhase == "frontend_error") put("frontend_error")
      if (startupPhase == "frontend_timeout") put("frontend_timeout")
      if (deadLetterJobs > 0) put("print_queue_dead_letter")
      if (deadLetterActions > 0) put("pending_action_dead_letter")
    }

    return JSONObject()
      .put("data", JSONObject()
        .put("startupPhase", startupPhase)
        .put("recoveryRunning", false)
        .put("degraded", degraded)
        .put("degradedReasons", degradedReasons)
        .put("lastRecoveryRun", JSONObject.NULL)
        .put("printQueue", queueStatus)
        .put("pendingActions", actionsStatus)
        .put("updatedAt", updatedAt)
      )
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun getPendingActions(): String {
    val startupPhase = runtimeState.startupPhase
    val queueStatus = configStore.getPrintQueueStatus()
    val actionsStatus = configStore.getPendingActionsStatus()
    
    val pendingPrintJobs =
      queueStatus.optInt("pending_jobs", 0) + queueStatus.optInt("retrying_jobs", 0) + queueStatus.optInt("dead_letter_jobs", 0)
    
    val pendingGenericActions = 
      actionsStatus.optInt("pending_actions", 0) + actionsStatus.optInt("retrying_actions", 0) + actionsStatus.optInt("dead_letter_actions", 0)

    val hasDeadLetter = queueStatus.optInt("dead_letter_jobs", 0) > 0 || actionsStatus.optInt("dead_letter_actions", 0) > 0

    val healthState = when {
      hasDeadLetter -> "degraded"
      startupPhase == "recovering" || startupPhase == "loading_frontend" -> "recovering"
      startupPhase == "frontend_error" || startupPhase == "frontend_timeout" -> "degraded"
      else -> "healthy"
    }

    val degradedReasons = JSONArray().apply {
      if (startupPhase == "frontend_error") put("frontend_error")
      if (startupPhase == "frontend_timeout") put("frontend_timeout")
      if (queueStatus.optInt("dead_letter_jobs", 0) > 0) put("print_queue_dead_letter")
      if (actionsStatus.optInt("dead_letter_actions", 0) > 0) put("pending_action_dead_letter")
    }

    return JSONObject()
      .put("data", JSONObject()
        .put("hasUnprintedOrders", pendingPrintJobs > 0)
        .put("unprintedOrdersCount", pendingPrintJobs)
        .put("printerPending", queueStatus)
        .put("genericActionsPending", actionsStatus)
        .put("hasUnreportedOrders", pendingGenericActions > 0) // Simplified mapping
        .put("unreportedOrdersCount", pendingGenericActions)
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
  fun getCloudSyncSettings(): String {
    return JSONObject()
      .put("data", configStore.readCloudSyncSettings())
      .put("error", JSONObject.NULL)
      .toString()
  }

  @JavascriptInterface
  fun updateCloudSyncSettings(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.updateCloudSyncSettings(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to update cloud sync settings")
        .toString()
    }
  }

  @JavascriptInterface
  fun performCloudHandshake(payloadJson: String): String {
    android.util.Log.i("SpeyposNativeBridge", "Handshake requested with payload: $payloadJson")
    return try {
      JSONObject()
        .put("data", configStore.performCloudHandshake(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      android.util.Log.e("SpeyposNativeBridge", "Handshake bridge error: ${error.message}")
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Cloud handshake failed")
        .toString()
    }
  }

  @JavascriptInterface
  fun syncOrders(shiftId: String): String {
    android.util.Log.i("SpeyposNativeBridge", "Manual sync requested for shift: $shiftId")
    return try {
      val enqueued = configStore.enqueueSyncJob("orders_shift_flush", shiftId)
      JSONObject()
        .put("data", JSONObject().put("enqueued", enqueued))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject()
        .put("data", JSONObject.NULL)
        .put("error", error.message ?: "Failed to enqueue sync job")
        .toString()
    }
  }

  @JavascriptInterface
  fun debugCloudSyncSettings(): String {
    return try {
      val settings = configStore.readCloudSyncSettings()
      JSONObject()
        .put("data", settings)
        .put("error", JSONObject.NULL)
        .toString()
    } catch (e: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", e.message).toString()
    }
  }

  @JavascriptInterface
  fun updateStore(payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.updateStore(JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", error.message).toString()
    }
  }

  @JavascriptInterface
  fun upsertSetting(key: String, payloadJson: String): String {
    return try {
      JSONObject()
        .put("data", configStore.upsertSetting(key, JSONObject(payloadJson)))
        .put("error", JSONObject.NULL)
        .toString()
    } catch (error: Exception) {
      JSONObject().put("data", JSONObject.NULL).put("error", error.message).toString()
    }
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