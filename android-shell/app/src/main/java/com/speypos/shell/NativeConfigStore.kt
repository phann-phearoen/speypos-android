package com.speypos.shell

import android.content.Context
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

class NativeConfigStore(private val context: Context) {

  fun seedIfNeeded() {
    val preferences = getPreferences()
    val editor = preferences.edit()
    var changed = false

    if (!preferences.contains(PREF_NATIVE_ORDERS_JSON)) {
      editor.putString(PREF_NATIVE_ORDERS_JSON, buildDefaultOrders().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_STAFF_JSON)) {
      editor.putString(PREF_NATIVE_STAFF_JSON, buildDefaultStaff().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_SHIFTS_JSON)) {
      editor.putString(PREF_NATIVE_SHIFTS_JSON, buildDefaultShifts().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON)) {
      editor.putString(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON, buildDefaultMenuItemCustomizationMappings().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON)) {
      editor.putString(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON, buildDefaultMenuCategoryCustomizationMappings().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON)) {
      editor.putString(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON, buildDefaultMenuItemToppingMappings().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON)) {
      editor.putString(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON, buildDefaultMenuCategoryToppingMappings().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON)) {
      editor.putString(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, buildDefaultCustomizationGroups().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON)) {
      editor.putString(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, buildDefaultCustomizationOptions().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_TOPPING_GROUPS_JSON)) {
      editor.putString(PREF_NATIVE_TOPPING_GROUPS_JSON, buildDefaultToppingGroups().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_TOPPING_OPTIONS_JSON)) {
      editor.putString(PREF_NATIVE_TOPPING_OPTIONS_JSON, buildDefaultToppingOptions().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_CATEGORIES_JSON)) {
      editor.putString(PREF_NATIVE_MENU_CATEGORIES_JSON, buildDefaultMenuCategories().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_MENU_ITEMS_JSON)) {
      editor.putString(PREF_NATIVE_MENU_ITEMS_JSON, buildDefaultMenuItems().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_STORE_JSON)) {
      editor.putString(PREF_NATIVE_STORE_JSON, buildDefaultStore().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_SETTINGS_JSON)) {
      editor.putString(PREF_NATIVE_SETTINGS_JSON, buildDefaultSettings().toString())
      changed = true
    }

    if (!preferences.contains(PREF_SYSTEM_INITIALIZED)) {
      editor.putBoolean(PREF_SYSTEM_INITIALIZED, true)
      changed = true
    }

    if (changed) {
      editor.apply()
    }
  }

  fun isSystemInitialized(): Boolean {
    return getPreferences().getBoolean(PREF_SYSTEM_INITIALIZED, false)
  }

  fun readStore(): JSONObject {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_STORE_JSON, null) ?: return buildDefaultStore()

    return try {
      JSONObject(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultStore()
      preferences.edit().putString(PREF_NATIVE_STORE_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readSettings(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_SETTINGS_JSON, null) ?: return buildDefaultSettings()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultSettings()
      preferences.edit().putString(PREF_NATIVE_SETTINGS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuCategories(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_CATEGORIES_JSON, null) ?: return buildDefaultMenuCategories()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuCategories()
      preferences.edit().putString(PREF_NATIVE_MENU_CATEGORIES_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuItems(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_ITEMS_JSON, null) ?: return buildDefaultMenuItems()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuItems()
      preferences.edit().putString(PREF_NATIVE_MENU_ITEMS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuItemCustomizationMappings(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON, null)
      ?: return buildDefaultMenuItemCustomizationMappings()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuItemCustomizationMappings()
      preferences.edit().putString(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuCategoryCustomizationMappings(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON, null)
      ?: return buildDefaultMenuCategoryCustomizationMappings()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuCategoryCustomizationMappings()
      preferences.edit().putString(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuItemToppingMappings(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON, null)
      ?: return buildDefaultMenuItemToppingMappings()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuItemToppingMappings()
      preferences.edit().putString(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readMenuCategoryToppingMappings(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON, null)
      ?: return buildDefaultMenuCategoryToppingMappings()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultMenuCategoryToppingMappings()
      preferences.edit().putString(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readCustomizationGroups(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, null)
      ?: return buildDefaultCustomizationGroups()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultCustomizationGroups()
      preferences.edit().putString(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readCustomizationOptions(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, null)
      ?: return buildDefaultCustomizationOptions()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultCustomizationOptions()
      preferences.edit().putString(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readToppingGroups(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_TOPPING_GROUPS_JSON, null)
      ?: return buildDefaultToppingGroups()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultToppingGroups()
      preferences.edit().putString(PREF_NATIVE_TOPPING_GROUPS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readToppingOptions(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_TOPPING_OPTIONS_JSON, null)
      ?: return buildDefaultToppingOptions()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultToppingOptions()
      preferences.edit().putString(PREF_NATIVE_TOPPING_OPTIONS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readShifts(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_SHIFTS_JSON, null) ?: return buildDefaultShifts()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultShifts()
      preferences.edit().putString(PREF_NATIVE_SHIFTS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readStaff(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_STAFF_JSON, null) ?: return buildDefaultStaff()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultStaff()
      preferences.edit().putString(PREF_NATIVE_STAFF_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun readOrders(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_ORDERS_JSON, null) ?: return buildDefaultOrders()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = buildDefaultOrders()
      preferences.edit().putString(PREF_NATIVE_ORDERS_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun createOrder(payload: JSONObject): JSONObject {
    val shiftId = payload.optString("shift_id", "")
    val staffId = payload.optString("staff_id", "")
    if (shiftId.isBlank() || staffId.isBlank()) {
      throw IllegalArgumentException("shift_id and staff_id are required")
    }

    val now = System.currentTimeMillis()
    val sourceItems = payload.optJSONArray("items") ?: JSONArray()
    val normalizedItems = JSONArray()
    var totalItems = 0
    var totalAmount = 0

    for (index in 0 until sourceItems.length()) {
      val item = sourceItems.optJSONObject(index) ?: continue
      val quantity = item.optInt("quantity", 1).coerceAtLeast(1)
      val unitPrice = item.optInt("unit_price", 0)
      val fallbackSubtotal = quantity * unitPrice
      val subtotal = item.optInt("subtotal", fallbackSubtotal)

      val normalized = JSONObject(item.toString())
        .put("quantity", quantity)
        .put("unit_price", unitPrice)
        .put("subtotal", subtotal)

      if (!normalized.has("customizations")) {
        normalized.put("customizations", JSONArray())
      }
      if (!normalized.has("toppings")) {
        normalized.put("toppings", JSONArray())
      }

      normalizedItems.put(normalized)
      totalItems += quantity
      totalAmount += subtotal
    }

    val newOrder = JSONObject()
      .put("id", "order-native-$now")
      .put("shift_id", shiftId)
      .put("staff_id", staffId)
      .put("customer_type", payload.optString("customer_type", "dine-in"))
      .put("items", normalizedItems)
      .put("total", totalAmount)
      .put("total_amount", totalAmount)
      .put("total_items", totalItems)
      .put("status", "pending")
      .put("created_at", now)

    val current = readOrders()
    val updated = JSONArray().put(newOrder)
    for (index in 0 until current.length()) {
      updated.put(current.get(index))
    }

    persistOrders(updated)
    return newOrder
  }

  fun payOrder(orderId: String, payload: JSONObject): JSONObject {
    val current = readOrders()
    val now = System.currentTimeMillis()
    var updatedOrder: JSONObject? = null
    val updated = JSONArray()

    for (index in 0 until current.length()) {
      val order = current.optJSONObject(index) ?: continue
      if (order.optString("id") == orderId) {
        if (order.optString("status") == "voided") {
          throw IllegalStateException("Cannot pay a voided order")
        }

        if (order.optString("status") == "completed" && order.has("payment")) {
          updated.put(order)
          updatedOrder = order
          continue
        }

        val merged = JSONObject(order.toString())
          .put("status", "completed")
          .put("payment", payload)
          .put("paid_at", now)
        updated.put(merged)
        updatedOrder = merged
      } else {
        updated.put(order)
      }
    }

    if (updatedOrder == null) {
      throw IllegalArgumentException("Order not found: $orderId")
    }

    persistOrders(updated)
    return updatedOrder
  }

  fun voidOrder(orderId: String, payload: JSONObject): JSONObject {
    val current = readOrders()
    val now = System.currentTimeMillis()
    var updatedOrder: JSONObject? = null
    val updated = JSONArray()

    for (index in 0 until current.length()) {
      val order = current.optJSONObject(index) ?: continue
      if (order.optString("id") == orderId) {
        if (order.optString("status") == "completed") {
          throw IllegalStateException("Cannot void a completed order")
        }

        val merged = JSONObject(order.toString())
          .put("status", "voided")
          .put("void_reason", payload.optString("void_reason", "other"))
          .put("void_note", payload.opt("void_note") ?: JSONObject.NULL)
          .put("voided_by", payload.optString("voided_by", ""))
          .put("voided_at", now)
        updated.put(merged)
        updatedOrder = merged
      } else {
        updated.put(order)
      }
    }

    if (updatedOrder == null) {
      throw IllegalArgumentException("Order not found: $orderId")
    }

    persistOrders(updated)
    return updatedOrder
  }

  fun printReceipt(orderId: String, mode: String): JSONObject {
    val current = readOrders()
    val now = System.currentTimeMillis()
    var updatedOrder: JSONObject? = null
    val updated = JSONArray()
    val allowReprint = mode == "reprint"

    for (index in 0 until current.length()) {
      val order = current.optJSONObject(index) ?: continue
      if (order.optString("id") == orderId) {
        if (order.optString("status") != "completed") {
          throw IllegalStateException("Cannot print receipt for non-completed order")
        }

        if (!allowReprint && order.optInt("print_count", 0) > 0) {
          val unchanged = JSONObject(order.toString())
            .put("duplicate_print_prevented", true)
          updated.put(unchanged)
          updatedOrder = unchanged
          continue
        }

        val merged = JSONObject(order.toString())
          .put("last_printed_at", now)
          .put("print_count", order.optInt("print_count", 0) + 1)
          .put("duplicate_print_prevented", false)
        updated.put(merged)
        updatedOrder = merged
      } else {
        updated.put(order)
      }
    }

    if (updatedOrder == null) {
      throw IllegalArgumentException("Order not found: $orderId")
    }

    persistOrders(updated)
    return updatedOrder
  }

  fun createStaff(payload: JSONObject): JSONObject {
    val now = System.currentTimeMillis()
    val newStaff = JSONObject()
      .put("id", "staff-native-$now")
      .put("name", payload.optString("name", ""))
      .put("password", payload.optString("password", ""))
      .put("role", payload.optString("role", "staff"))
      .put("status", payload.optString("status", "active"))
      .put("image_url", payload.opt("image_url") ?: JSONObject.NULL)
      .put("created_at", now)
      .put("updated_at", now)

    if (newStaff.optString("name").isBlank()) {
      throw IllegalArgumentException("Staff name is required")
    }

    val staff = readStaff()
    val updated = JSONArray()
    updated.put(newStaff)
    for (index in 0 until staff.length()) {
      updated.put(staff.get(index))
    }

    persistStaff(updated)
    return newStaff
  }

  fun updateStaff(staffId: String, payload: JSONObject): JSONObject {
    val staff = readStaff()
    val now = System.currentTimeMillis()
    var updatedStaff: JSONObject? = null
    val updated = JSONArray()

    for (index in 0 until staff.length()) {
      val entry = staff.optJSONObject(index) ?: continue
      if (entry.optString("id") == staffId) {
        val merged = JSONObject(entry.toString())
        if (payload.has("name")) {
          merged.put("name", payload.optString("name", merged.optString("name")))
        }
        if (payload.has("password")) {
          merged.put("password", payload.optString("password", merged.optString("password")))
        }
        if (payload.has("role")) {
          merged.put("role", payload.optString("role", merged.optString("role")))
        }
        if (payload.has("status")) {
          merged.put("status", payload.optString("status", merged.optString("status")))
        }
        if (payload.has("image_url")) {
          merged.put("image_url", payload.opt("image_url") ?: JSONObject.NULL)
        }
        merged.put("updated_at", now)

        if (merged.optString("name").isBlank()) {
          throw IllegalArgumentException("Staff name is required")
        }

        updated.put(merged)
        updatedStaff = merged
      } else {
        updated.put(entry)
      }
    }

    if (updatedStaff == null) {
      throw IllegalArgumentException("Staff not found: $staffId")
    }

    persistStaff(updated)
    return updatedStaff
  }

  fun deleteStaff(staffId: String): JSONObject {
    val staff = readStaff()
    val updated = JSONArray()
    var deleted = false

    for (index in 0 until staff.length()) {
      val entry = staff.optJSONObject(index) ?: continue
      if (entry.optString("id") == staffId) {
        deleted = true
        continue
      }
      updated.put(entry)
    }

    if (!deleted) {
      throw IllegalArgumentException("Staff not found: $staffId")
    }

    persistStaff(updated)
    return JSONObject()
      .put("message", "Staff deleted")
      .put("id", staffId)
  }

  fun openShift(staffId: String): JSONObject {
    val shifts = readShifts()
    for (index in 0 until shifts.length()) {
      val shift = shifts.optJSONObject(index) ?: continue
      if (shift.optString("status") == "open") {
        throw IllegalStateException("An open shift already exists.")
      }
    }

    val now = System.currentTimeMillis()
    val newShift = JSONObject()
      .put("id", "shift-native-$now")
      .put("staff_id", staffId)
      .put("date", LocalDate.now().toString())
      .put("started_at", now)
      .put("ended_at", JSONObject.NULL)
      .put("status", "open")

    val updated = JSONArray()
    updated.put(newShift)
    for (index in 0 until shifts.length()) {
      updated.put(shifts.get(index))
    }

    persistShifts(updated)
    return newShift
  }

  fun closeShift(shiftId: String): JSONObject {
    val shifts = readShifts()
    val now = System.currentTimeMillis()
    var updatedShift: JSONObject? = null
    val updated = JSONArray()

    for (index in 0 until shifts.length()) {
      val shift = shifts.optJSONObject(index) ?: continue
      if (shift.optString("id") == shiftId && shift.optString("status") == "open") {
        val closed = JSONObject(shift.toString())
          .put("status", "closed")
          .put("ended_at", now)
        updated.put(closed)
        updatedShift = closed
      } else {
        updated.put(shift)
      }
    }

    if (updatedShift == null) {
      throw IllegalArgumentException("Open shift not found: $shiftId")
    }

    persistShifts(updated)
    return updatedShift
  }

  fun closeDay(): JSONObject {
    val shifts = readShifts()
    val now = System.currentTimeMillis()
    var closedCount = 0
    val updated = JSONArray()

    for (index in 0 until shifts.length()) {
      val shift = shifts.optJSONObject(index) ?: continue
      if (shift.optString("status") == "open") {
        val closed = JSONObject(shift.toString())
          .put("status", "closed")
          .put("ended_at", now)
        updated.put(closed)
        closedCount += 1
      } else {
        updated.put(shift)
      }
    }

    persistShifts(updated)
    return JSONObject()
      .put("message", "Closed $closedCount shift(s).")
      .put("closed_count", closedCount)
  }

  private fun getPreferences() =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  private fun persistShifts(shifts: JSONArray) {
    getPreferences().edit().putString(PREF_NATIVE_SHIFTS_JSON, shifts.toString()).apply()
  }

  private fun persistStaff(staff: JSONArray) {
    getPreferences().edit().putString(PREF_NATIVE_STAFF_JSON, staff.toString()).apply()
  }

  private fun persistOrders(orders: JSONArray) {
    getPreferences().edit().putString(PREF_NATIVE_ORDERS_JSON, orders.toString()).apply()
  }

  private fun buildDefaultOrders(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "order-native-1")
        .put("shift_id", "shift-native-open-1")
        .put("staff_id", "staff-native-1")
        .put("items", JSONArray().put(JSONObject()
          .put("id", "order-item-native-1")
          .put("menu_item_id", "item-americano")
          .put("menu_item_name", "Americano")
          .put("quantity", 1)
          .put("unit_price", 250)
          .put("customizations", JSONArray())
          .put("toppings", JSONArray())
          .put("subtotal", 250)
        ))
        .put("total", 250)
        .put("total_amount", 250)
        .put("total_items", 1)
        .put("status", "completed")
        .put("created_at", 1778637600000L)
      )
      .put(JSONObject()
        .put("id", "order-native-2")
        .put("shift_id", "shift-native-closed-1")
        .put("staff_id", "staff-native-2")
        .put("items", JSONArray().put(JSONObject()
          .put("id", "order-item-native-2")
          .put("menu_item_id", "item-latte")
          .put("menu_item_name", "Latte")
          .put("quantity", 2)
          .put("unit_price", 320)
          .put("customizations", JSONArray())
          .put("toppings", JSONArray())
          .put("subtotal", 640)
        ))
        .put("total", 640)
        .put("total_amount", 640)
        .put("total_items", 2)
        .put("status", "completed")
        .put("created_at", 1778551200000L)
      )
  }

  private fun buildDefaultStore(): JSONObject {
    return JSONObject()
      .put("id", "android-shell-store")
      .put("name", "SpeyPOS")
      .put("language", "en")
      .put("currency", "USD")
      .put("timezone", "Asia/Phnom_Penh")
      .put("brand_name", JSONObject.NULL)
      .put("logo_url", JSONObject.NULL)
      .put("address", JSONObject.NULL)
      .put("payment_profile", JSONObject.NULL)
  }

  private fun buildDefaultSettings(): JSONArray {
    return JSONArray()
      .put(buildSettingRecord(
        id = "android-system-initialized",
        key = "system.initialized",
        value = true,
        valueType = "boolean",
        category = "System",
        description = "Indicates if the initial setup has been completed."
      ))
      .put(buildSettingRecord(
        id = "android-receipt-copies",
        key = "receipt.copies",
        value = JSONObject()
          .put("version", 1)
          .put("copies", JSONArray().put(
            JSONObject()
              .put("variant", "INTERNAL")
              .put("count", 1)
          )),
        valueType = "json",
        category = "Printing",
        description = "Configuration for how many copies of a receipt to print for different purposes."
      ))
      .put(buildSettingRecord(
        id = "android-printer-lan",
        key = "printer.lan",
        value = JSONObject()
          .put("version", 1)
          .put("enabled", false)
          .put("protocol", "raw9100")
          .put("host", "")
          .put("port", 9100)
          .put("timeout_ms", 5000)
          .put("profile", "default"),
        valueType = "json",
        category = "Printing",
        description = "LAN printer configuration for RAW TCP printing transport."
      ))
      .put(buildSettingRecord(
        id = "android-telegram-intents",
        key = "telegram.intents",
        value = JSONObject()
          .put("version", 1)
          .put("intents", JSONArray()
            .put(JSONObject().put("intent", "ORDER_TRACKER").put("enabled", false).put("chat_id", ""))
            .put(JSONObject().put("intent", "SHIFT_TRACKER").put("enabled", false).put("chat_id", ""))
          ),
        valueType = "json",
        category = "Integrations",
        description = "Configuration for Telegram reporting intents."
      ))
      .put(buildSettingRecord(
        id = "android-cloud-sync",
        key = "cloud.sync",
        value = JSONObject()
          .put("version", 1)
          .put("enabled", false)
          .put("api_key", "")
          .put("base_url", "")
          .put("store_id", JSONObject.NULL)
          .put("store_linked_at", JSONObject.NULL)
          .put("store_client_name", JSONObject.NULL)
          .put("store_last_seen_at", JSONObject.NULL),
        valueType = "json",
        category = "Cloud Sync",
        description = "Cloud ingestion configuration (toggle, key, base URL)."
      ))
  }

  private fun buildDefaultMenuCategories(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "cat-coffee")
        .put("name", "Coffee")
        .put("image_url", JSONObject.NULL)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "cat-tea")
        .put("name", "Tea")
        .put("image_url", JSONObject.NULL)
        .put("sort_order", 20)
      )
  }

  private fun buildDefaultMenuItems(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "item-americano")
        .put("name", "Americano")
        .put("price", 250)
        .put("image_url", JSONObject.NULL)
        .put("category_ids", JSONArray().put("cat-coffee"))
      )
      .put(JSONObject()
        .put("id", "item-latte")
        .put("name", "Latte")
        .put("price", 320)
        .put("image_url", JSONObject.NULL)
        .put("category_ids", JSONArray().put("cat-coffee"))
      )
      .put(JSONObject()
        .put("id", "item-green-tea")
        .put("name", "Green Tea")
        .put("price", 220)
        .put("image_url", JSONObject.NULL)
        .put("category_ids", JSONArray().put("cat-tea"))
      )
  }

  private fun buildDefaultMenuItemCustomizationMappings(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "micm-americano-temp")
        .put("menu_item_id", "item-americano")
        .put("customization_group_id", "cgrp-drink-temp")
      )
      .put(JSONObject()
        .put("id", "micm-latte-temp")
        .put("menu_item_id", "item-latte")
        .put("customization_group_id", "cgrp-drink-temp")
      )
  }

  private fun buildDefaultMenuCategoryCustomizationMappings(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "mccm-tea-sugar")
        .put("menu_category_id", "cat-tea")
        .put("customization_group_id", "cgrp-sugar")
      )
  }

  private fun buildDefaultMenuItemToppingMappings(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "mitm-latte-extra-shot")
        .put("menu_item_id", "item-latte")
        .put("topping_group_id", "tgrp-extra-shot")
      )
  }

  private fun buildDefaultMenuCategoryToppingMappings(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "mctm-tea-add-ons")
        .put("menu_category_id", "cat-tea")
        .put("topping_group_id", "tgrp-tea-add-ons")
      )
  }

  private fun buildDefaultCustomizationGroups(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "cgrp-drink-temp")
        .put("name", "Temperature")
        .put("selection_type", "single")
        .put("required", true)
        .put("sort_order", 10)
        .put("default_option_id", "copt-temp-hot")
      )
      .put(JSONObject()
        .put("id", "cgrp-sugar")
        .put("name", "Sugar")
        .put("selection_type", "single")
        .put("required", false)
        .put("sort_order", 20)
        .put("default_option_id", JSONObject.NULL)
      )
  }

  private fun buildDefaultCustomizationOptions(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "copt-temp-hot")
        .put("customization_group_id", "cgrp-drink-temp")
        .put("label", "Hot")
        .put("price_delta", 0)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "copt-temp-iced")
        .put("customization_group_id", "cgrp-drink-temp")
        .put("label", "Iced")
        .put("price_delta", 0)
        .put("sort_order", 20)
      )
      .put(JSONObject()
        .put("id", "copt-sugar-normal")
        .put("customization_group_id", "cgrp-sugar")
        .put("label", "Normal Sugar")
        .put("price_delta", 0)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "copt-sugar-less")
        .put("customization_group_id", "cgrp-sugar")
        .put("label", "Less Sugar")
        .put("price_delta", 0)
        .put("sort_order", 20)
      )
      .put(JSONObject()
        .put("id", "copt-sugar-none")
        .put("customization_group_id", "cgrp-sugar")
        .put("label", "No Sugar")
        .put("price_delta", 0)
        .put("sort_order", 30)
      )
  }

  private fun buildDefaultToppingGroups(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "tgrp-extra-shot")
        .put("name", "Extra Shot")
        .put("required", false)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "tgrp-tea-add-ons")
        .put("name", "Tea Add-ons")
        .put("required", false)
        .put("sort_order", 20)
      )
  }

  private fun buildDefaultToppingOptions(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "topt-extra-espresso")
        .put("topping_group_id", "tgrp-extra-shot")
        .put("label", "Extra Espresso")
        .put("unit_label", "shot")
        .put("unit_price", 80)
        .put("min_quantity", 0)
        .put("max_quantity", 3)
        .put("step_quantity", 1)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "topt-whipped-cream")
        .put("topping_group_id", "tgrp-tea-add-ons")
        .put("label", "Whipped Cream")
        .put("unit_label", "portion")
        .put("unit_price", 60)
        .put("min_quantity", 0)
        .put("max_quantity", 2)
        .put("step_quantity", 1)
        .put("sort_order", 10)
      )
      .put(JSONObject()
        .put("id", "topt-boba")
        .put("topping_group_id", "tgrp-tea-add-ons")
        .put("label", "Boba")
        .put("unit_label", "portion")
        .put("unit_price", 70)
        .put("min_quantity", 0)
        .put("max_quantity", 2)
        .put("step_quantity", 1)
        .put("sort_order", 20)
      )
  }

  private fun buildDefaultShifts(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "shift-native-open-1")
        .put("staff_id", "staff-native-1")
        .put("date", "2026-05-13")
        .put("started_at", 1778634000000L)
        .put("ended_at", JSONObject.NULL)
        .put("status", "open")
      )
      .put(JSONObject()
        .put("id", "shift-native-closed-1")
        .put("staff_id", "staff-native-2")
        .put("date", "2026-05-12")
        .put("started_at", 1778547600000L)
        .put("ended_at", 1778572800000L)
        .put("status", "closed")
      )
  }

  private fun buildDefaultStaff(): JSONArray {
    return JSONArray()
      .put(JSONObject()
        .put("id", "staff-native-1")
        .put("name", "Native Admin")
        .put("role", "admin")
        .put("status", "active")
      )
      .put(JSONObject()
        .put("id", "staff-native-2")
        .put("name", "Native Staff")
        .put("role", "staff")
        .put("status", "active")
      )
  }

  private fun buildSettingRecord(
    id: String,
    key: String,
    value: Any,
    valueType: String,
    category: String,
    description: String
  ): JSONObject {
    return JSONObject()
      .put("id", id)
      .put("key", key)
      .put("value", value)
      .put("value_type", valueType)
      .put("category", category)
      .put("description", description)
  }

  companion object {
    private const val PREFERENCES_NAME = "speypos_shell"
    private const val PREF_SYSTEM_INITIALIZED = "system.initialized"
    private const val PREF_NATIVE_ORDERS_JSON = "native.orders.json"
    private const val PREF_NATIVE_STAFF_JSON = "native.staff.json"
    private const val PREF_NATIVE_SHIFTS_JSON = "native.shifts.json"
    private const val PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON = "native.menu.item.customization.mappings.json"
    private const val PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON = "native.menu.category.customization.mappings.json"
    private const val PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON = "native.menu.item.topping.mappings.json"
    private const val PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON = "native.menu.category.topping.mappings.json"
    private const val PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON = "native.customization.groups.json"
    private const val PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON = "native.customization.options.json"
    private const val PREF_NATIVE_TOPPING_GROUPS_JSON = "native.topping.groups.json"
    private const val PREF_NATIVE_TOPPING_OPTIONS_JSON = "native.topping.options.json"
    private const val PREF_NATIVE_MENU_CATEGORIES_JSON = "native.menu.categories.json"
    private const val PREF_NATIVE_MENU_ITEMS_JSON = "native.menu.items.json"
    private const val PREF_NATIVE_STORE_JSON = "native.store.json"
    private const val PREF_NATIVE_SETTINGS_JSON = "native.settings.json"
  }
}