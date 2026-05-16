package com.speypos.shell

import android.content.Context
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import java.time.LocalDate
import java.util.UUID
import java.util.concurrent.locks.ReentrantLock
import org.json.JSONArray
import org.json.JSONObject

class NativeConfigStore(private val context: Context) {

  companion object {
    private val printLock = ReentrantLock()
    private val globalFileLock = Any()
    
    private const val PREFERENCES_NAME = "speypos_shell"
    private const val PREF_SYSTEM_INITIALIZED = "system.initialized"
    private const val PREF_NATIVE_ORDERS_JSON = "native.orders.json"
    private const val PREF_NATIVE_STAFF_JSON = "native.staff.json"
    private const val PREF_NATIVE_SHIFTS_JSON = "native.shifts.json"
    private const val PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON = "native.menu.item.category.mappings.json"
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
    private const val PREF_NATIVE_PRINT_QUEUE_JSON = "native.print.queue.json"
    private const val PREF_NATIVE_PENDING_ACTIONS_JSON = "native.pending.actions.json"
    private const val PREF_NATIVE_SYNC_QUEUE_JSON = "native.sync.queue.json"
    private const val DEFAULT_MAX_PRINT_ATTEMPTS = 5

    private const val PRINT_JOB_PENDING = "pending"
    private const val PRINT_JOB_RETRYING = "retrying"
    private const val PRINT_JOB_PROCESSING = "processing"
    private const val PRINT_JOB_SUCCEEDED = "succeeded"
    private const val PRINT_JOB_DUPLICATE_PREVENTED = "duplicate_prevented"
    private const val PRINT_JOB_DEAD_LETTER = "dead_letter"

    internal const val ACTION_TYPE_PRINT = "PRINT"
    internal const val ACTION_TYPE_CLOUD_SYNC = "CLOUD_SYNC"
    internal const val ACTION_TYPE_ORDER_REPORT = "ORDER_REPORT"
    internal const val ACTION_TYPE_SHIFT_REPORT = "SHIFT_REPORT"
    internal const val ACTION_TYPE_DAY_CLOSE_REPORT = "DAY_CLOSE_REPORT"

    private const val ACTION_STATUS_PENDING = "pending"
    private const val ACTION_STATUS_RETRYING = "retrying"
    private const val ACTION_STATUS_PROCESSING = "processing"
    private const val ACTION_STATUS_SUCCEEDED = "succeeded"
    private const val ACTION_STATUS_DEAD_LETTER = "dead_letter"

    private const val SYNC_JOB_TYPE_MINI_BATCH = "orders_shift_mini_batch"
    private const val SYNC_JOB_TYPE_FLUSH = "orders_shift_flush"
  }

  fun seedIfNeeded() {
    val preferences = getPreferences()
    val editor = preferences.edit()
    var changed = false

    val operationalKeys = listOf(
      PREF_NATIVE_ORDERS_JSON,
      PREF_NATIVE_STAFF_JSON,
      PREF_NATIVE_SHIFTS_JSON,
      PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON,
      PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON,
      PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON,
      PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON,
      PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON,
      PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON,
      PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON,
      PREF_NATIVE_TOPPING_GROUPS_JSON,
      PREF_NATIVE_TOPPING_OPTIONS_JSON,
      PREF_NATIVE_MENU_CATEGORIES_JSON,
      PREF_NATIVE_MENU_ITEMS_JSON,
      PREF_NATIVE_PRINT_QUEUE_JSON,
      PREF_NATIVE_PENDING_ACTIONS_JSON,
      PREF_NATIVE_SYNC_QUEUE_JSON
    )

    operationalKeys.forEach { key ->
      if (!preferences.contains(key)) {
        editor.putString(key, JSONArray().toString())
        changed = true
      }
    }

    if (!preferences.contains(PREF_NATIVE_STORE_JSON)) {
      editor.putString(PREF_NATIVE_STORE_JSON, buildDefaultStore().toString())
      changed = true
    }

    if (!preferences.contains(PREF_NATIVE_SETTINGS_JSON)) {
      editor.putString(PREF_NATIVE_SETTINGS_JSON, buildDefaultSettings().toString())
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
    return readArray(PREF_NATIVE_MENU_CATEGORIES_JSON)
  }

  fun createMenuCategory(payload: JSONObject): JSONObject {
    val now = System.currentTimeMillis()
    val newCategory = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("name", payload.optString("name", ""))
      .put("image_url", payload.opt("image_url") ?: JSONObject.NULL)
      .put("sort_order", payload.optInt("sort_order", 0))
      .put("created_at", now)

    if (newCategory.optString("name").isBlank()) {
      throw IllegalArgumentException("Category name is required")
    }

    val categories = readMenuCategories()
    categories.put(newCategory)
    persistArray(PREF_NATIVE_MENU_CATEGORIES_JSON, categories)
    return newCategory
  }

  fun updateMenuCategory(categoryId: String, payload: JSONObject): JSONObject {
    val categories = readMenuCategories()
    var updatedCategory: JSONObject? = null
    val updated = JSONArray()

    for (index in 0 until categories.length()) {
      val entry = categories.optJSONObject(index) ?: continue
      if (entry.optString("id") == categoryId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        updated.put(merged)
        updatedCategory = merged
      } else {
        updated.put(entry)
      }
    }

    if (updatedCategory == null) throw IllegalArgumentException("Category not found: $categoryId")
    persistArray(PREF_NATIVE_MENU_CATEGORIES_JSON, updated)
    return updatedCategory
  }

  fun deleteMenuCategory(categoryId: String): JSONObject {
    val categories = readMenuCategories()
    val updated = JSONArray()
    var found = false

    for (index in 0 until categories.length()) {
      val entry = categories.optJSONObject(index) ?: continue
      if (entry.optString("id") == categoryId) {
        found = true
        continue
      }
      updated.put(entry)
    }

    if (!found) throw IllegalArgumentException("Category not found: $categoryId")
    
    // Cleanup mappings
    val mappings = readMenuItemCategoryMappings()
    val updatedMappings = JSONArray()
    for (i in 0 until mappings.length()) {
      val m = mappings.optJSONObject(i) ?: continue
      if (m.optString("menu_category_id") != categoryId) {
        updatedMappings.put(m)
      }
    }
    persistArray(PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON, updatedMappings)
    
    persistArray(PREF_NATIVE_MENU_CATEGORIES_JSON, updated)
    return JSONObject().put("success", true)
  }

  fun readMenuItems(): JSONArray {
    val items = readArray(PREF_NATIVE_MENU_ITEMS_JSON)
    val mappings = readMenuItemCategoryMappings()
    
    val enriched = JSONArray()
    for (i in 0 until items.length()) {
      val item = items.optJSONObject(i) ?: continue
      val itemId = item.optString("id")
      val categoryIds = JSONArray()
      for (j in 0 until mappings.length()) {
        val m = mappings.optJSONObject(j) ?: continue
        if (m.optString("menu_item_id") == itemId) {
          categoryIds.put(m.optString("menu_category_id"))
        }
      }
      val enrichedItem = JSONObject(item.toString()).put("category_ids", categoryIds)
      enriched.put(enrichedItem)
    }
    return enriched
  }

  fun createMenuItem(payload: JSONObject): JSONObject {
    val now = System.currentTimeMillis()
    val newItem = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("name", payload.optString("name", ""))
      .put("price", payload.optInt("price", 0))
      .put("image_url", payload.opt("image_url") ?: JSONObject.NULL)
      .put("created_at", now)
      .put("updated_at", now)

    if (newItem.optString("name").isBlank()) {
      throw IllegalArgumentException("Item name is required")
    }

    val items = readArray(PREF_NATIVE_MENU_ITEMS_JSON)
    items.put(newItem)
    persistArray(PREF_NATIVE_MENU_ITEMS_JSON, items)
    
    // Return enriched object
    return newItem.put("category_ids", JSONArray())
  }

  fun updateMenuItem(itemId: String, payload: JSONObject): JSONObject {
    val items = readArray(PREF_NATIVE_MENU_ITEMS_JSON)
    var updatedItem: JSONObject? = null
    val updated = JSONArray()
    val now = System.currentTimeMillis()

    for (index in 0 until items.length()) {
      val entry = items.optJSONObject(index) ?: continue
      if (entry.optString("id") == itemId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        merged.put("updated_at", now)
        updated.put(merged)
        updatedItem = merged
      } else {
        updated.put(entry)
      }
    }

    if (updatedItem == null) throw IllegalArgumentException("Item not found: $itemId")
    persistArray(PREF_NATIVE_MENU_ITEMS_JSON, updated)
    
    // Enrich response with category_ids
    val mappings = readMenuItemCategoryMappings()
    val categoryIds = JSONArray()
    for (j in 0 until mappings.length()) {
      val m = mappings.optJSONObject(j) ?: continue
      if (m.optString("menu_item_id") == itemId) {
        categoryIds.put(m.optString("menu_category_id"))
      }
    }
    return updatedItem.put("category_ids", categoryIds)
  }

  fun deleteMenuItem(itemId: String): JSONObject {
    val items = readArray(PREF_NATIVE_MENU_ITEMS_JSON)
    val updated = JSONArray()
    var found = false

    for (index in 0 until items.length()) {
      val entry = items.optJSONObject(index) ?: continue
      if (entry.optString("id") == itemId) {
        found = true
        continue
      }
      updated.put(entry)
    }

    if (!found) throw IllegalArgumentException("Item not found: $itemId")
    
    // Cleanup mappings
    val mappings = readMenuItemCategoryMappings()
    val updatedMappings = JSONArray()
    for (i in 0 until mappings.length()) {
      val m = mappings.optJSONObject(i) ?: continue
      if (m.optString("menu_item_id") != itemId) {
        updatedMappings.put(m)
      }
    }
    persistArray(PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON, updatedMappings)
    
    persistArray(PREF_NATIVE_MENU_ITEMS_JSON, updated)
    return JSONObject().put("success", true)
  }

  fun readMenuItemCategoryMappings(): JSONArray {
    return readArray(PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON)
  }

  fun createMenuItemCategoryMapping(payload: JSONObject): JSONObject {
    val newMapping = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("menu_item_id", payload.optString("menu_item_id"))
      .put("menu_category_id", payload.optString("menu_category_id"))

    val mappings = readMenuItemCategoryMappings()
    mappings.put(newMapping)
    persistArray(PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON, mappings)
    return newMapping
  }

  fun deleteMenuItemCategoryMapping(mappingId: String): JSONObject {
    val mappings = readMenuItemCategoryMappings()
    val updated = JSONArray()
    var found = false

    for (index in 0 until mappings.length()) {
      val entry = mappings.optJSONObject(index) ?: continue
      if (entry.optString("id") == mappingId) {
        found = true
        continue
      }
      updated.put(entry)
    }

    if (!found) throw IllegalArgumentException("Mapping not found: $mappingId")
    persistArray(PREF_NATIVE_MENU_ITEM_CATEGORY_MAPPINGS_JSON, updated)
    return JSONObject().put("success", true)
  }

  // Customization Groups
  fun createCustomizationGroup(payload: JSONObject): JSONObject {
    val newGroup = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("name", payload.optString("name"))
      .put("selection_type", payload.optString("selection_type", "single"))
      .put("required", payload.optBoolean("required", false))
      .put("sort_order", payload.optInt("sort_order", 0))
      .put("default_option_id", payload.opt("default_option_id") ?: JSONObject.NULL)

    val groups = readArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON)
    groups.put(newGroup)
    persistArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, groups)
    return newGroup
  }

  fun updateCustomizationGroup(groupId: String, payload: JSONObject): JSONObject {
    val groups = readArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON)
    var updated: JSONObject? = null
    val newArray = JSONArray()

    for (i in 0 until groups.length()) {
      val entry = groups.optJSONObject(i) ?: continue
      if (entry.optString("id") == groupId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        newArray.put(merged)
        updated = merged
      } else {
        newArray.put(entry)
      }
    }
    if (updated == null) throw IllegalArgumentException("Group not found")
    persistArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, newArray)
    return updated
  }

  fun deleteCustomizationGroup(groupId: String): JSONObject {
    val groups = readArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON)
    val newArray = JSONArray()
    var found = false
    for (i in 0 until groups.length()) {
      val entry = groups.optJSONObject(i) ?: continue
      if (entry.optString("id") == groupId) {
        found = true
        continue
      }
      newArray.put(entry)
    }
    if (!found) throw IllegalArgumentException("Group not found")
    persistArray(PREF_NATIVE_CUSTOMIZATION_GROUPS_JSON, newArray)
    return JSONObject().put("success", true)
  }

  // Customization Options
  fun createCustomizationOption(payload: JSONObject): JSONObject {
    val newOption = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("customization_group_id", payload.optString("customization_group_id"))
      .put("label", payload.optString("label"))
      .put("price_delta", payload.optInt("price_delta", 0))
      .put("sort_order", payload.optInt("sort_order", 0))

    val options = readArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON)
    options.put(newOption)
    persistArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, options)
    return newOption
  }

  fun updateCustomizationOption(optionId: String, payload: JSONObject): JSONObject {
    val options = readArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON)
    var updated: JSONObject? = null
    val newArray = JSONArray()

    for (i in 0 until options.length()) {
      val entry = options.optJSONObject(i) ?: continue
      if (entry.optString("id") == optionId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        newArray.put(merged)
        updated = merged
      } else {
        newArray.put(entry)
      }
    }
    if (updated == null) throw IllegalArgumentException("Option not found")
    persistArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, newArray)
    return updated
  }

  fun deleteCustomizationOption(optionId: String): JSONObject {
    val options = readArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON)
    val newArray = JSONArray()
    var found = false
    for (i in 0 until options.length()) {
      val entry = options.optJSONObject(i) ?: continue
      if (entry.optString("id") == optionId) {
        found = true
        continue
      }
      newArray.put(entry)
    }
    if (!found) throw IllegalArgumentException("Option not found")
    persistArray(PREF_NATIVE_CUSTOMIZATION_OPTIONS_JSON, newArray)
    return JSONObject().put("success", true)
  }

  // Topping Groups
  fun createToppingGroup(payload: JSONObject): JSONObject {
    val newGroup = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("name", payload.optString("name"))
      .put("required", payload.optBoolean("required", false))
      .put("sort_order", payload.optInt("sort_order", 0))

    val groups = readArray(PREF_NATIVE_TOPPING_GROUPS_JSON)
    groups.put(newGroup)
    persistArray(PREF_NATIVE_TOPPING_GROUPS_JSON, groups)
    return newGroup
  }

  fun updateToppingGroup(groupId: String, payload: JSONObject): JSONObject {
    val groups = readArray(PREF_NATIVE_TOPPING_GROUPS_JSON)
    var updated: JSONObject? = null
    val newArray = JSONArray()

    for (i in 0 until groups.length()) {
      val entry = groups.optJSONObject(i) ?: continue
      if (entry.optString("id") == groupId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        newArray.put(merged)
        updated = merged
      } else {
        newArray.put(entry)
      }
    }
    if (updated == null) throw IllegalArgumentException("Group not found")
    persistArray(PREF_NATIVE_TOPPING_GROUPS_JSON, newArray)
    return updated
  }

  fun deleteToppingGroup(groupId: String): JSONObject {
    val groups = readArray(PREF_NATIVE_TOPPING_GROUPS_JSON)
    val newArray = JSONArray()
    var found = false
    for (i in 0 until groups.length()) {
      val entry = groups.optJSONObject(i) ?: continue
      if (entry.optString("id") == groupId) {
        found = true
        continue
      }
      newArray.put(entry)
    }
    if (!found) throw IllegalArgumentException("Group not found")
    persistArray(PREF_NATIVE_TOPPING_GROUPS_JSON, newArray)
    return JSONObject().put("success", true)
  }

  // Topping Options
  fun createToppingOption(payload: JSONObject): JSONObject {
    val newOption = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("topping_group_id", payload.optString("topping_group_id"))
      .put("label", payload.optString("label"))
      .put("unit_label", payload.optString("unit_label", ""))
      .put("unit_price", payload.optInt("unit_price", 0))
      .put("min_quantity", payload.optInt("min_quantity", 0))
      .put("max_quantity", payload.opt("max_quantity") ?: JSONObject.NULL)
      .put("step_quantity", payload.optInt("step_quantity", 1))
      .put("sort_order", payload.optInt("sort_order", 0))

    val options = readArray(PREF_NATIVE_TOPPING_OPTIONS_JSON)
    options.put(newOption)
    persistArray(PREF_NATIVE_TOPPING_OPTIONS_JSON, options)
    return newOption
  }

  fun updateToppingOption(optionId: String, payload: JSONObject): JSONObject {
    val options = readArray(PREF_NATIVE_TOPPING_OPTIONS_JSON)
    var updated: JSONObject? = null
    val newArray = JSONArray()

    for (i in 0 until options.length()) {
      val entry = options.optJSONObject(i) ?: continue
      if (entry.optString("id") == optionId) {
        val merged = JSONObject(entry.toString())
        val keys = payload.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          merged.put(key, payload.get(key))
        }
        newArray.put(merged)
        updated = merged
      } else {
        newArray.put(entry)
      }
    }
    if (updated == null) throw IllegalArgumentException("Option not found")
    persistArray(PREF_NATIVE_TOPPING_OPTIONS_JSON, newArray)
    return updated
  }

  fun deleteToppingOption(optionId: String): JSONObject {
    val options = readArray(PREF_NATIVE_TOPPING_OPTIONS_JSON)
    val newArray = JSONArray()
    var found = false
    for (i in 0 until options.length()) {
      val entry = options.optJSONObject(i) ?: continue
      if (entry.optString("id") == optionId) {
        found = true
        continue
      }
      newArray.put(entry)
    }
    if (!found) throw IllegalArgumentException("Option not found")
    persistArray(PREF_NATIVE_TOPPING_OPTIONS_JSON, newArray)
    return JSONObject().put("success", true)
  }

  // Mappings (Customizations & Toppings)
  fun createMenuItemCustomizationMapping(payload: JSONObject): JSONObject {
    val newMapping = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("menu_item_id", payload.optString("menu_item_id"))
      .put("customization_group_id", payload.optString("customization_group_id"))
    val arr = readArray(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON)
    arr.put(newMapping)
    persistArray(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON, arr)
    return newMapping
  }

  fun deleteMenuItemCustomizationMapping(id: String): JSONObject {
    val arr = readArray(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON)
    val newArr = JSONArray()
    var found = false
    for (i in 0 until arr.length()) {
      val e = arr.optJSONObject(i) ?: continue
      if (e.optString("id") == id) { found = true; continue }
      newArr.put(e)
    }
    if (!found) throw IllegalArgumentException("Mapping not found")
    persistArray(PREF_NATIVE_MENU_ITEM_CUSTOMIZATION_MAPPINGS_JSON, newArr)
    return JSONObject().put("success", true)
  }

  fun createMenuCategoryCustomizationMapping(payload: JSONObject): JSONObject {
    val newMapping = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("menu_category_id", payload.optString("menu_category_id"))
      .put("customization_group_id", payload.optString("customization_group_id"))
    val arr = readArray(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON)
    arr.put(newMapping)
    persistArray(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON, arr)
    return newMapping
  }

  fun deleteMenuCategoryCustomizationMapping(id: String): JSONObject {
    val arr = readArray(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON)
    val newArr = JSONArray()
    var found = false
    for (i in 0 until arr.length()) {
      val e = arr.optJSONObject(i) ?: continue
      if (e.optString("id") == id) { found = true; continue }
      newArr.put(e)
    }
    if (!found) throw IllegalArgumentException("Mapping not found")
    persistArray(PREF_NATIVE_MENU_CATEGORY_CUSTOMIZATION_MAPPINGS_JSON, newArr)
    return JSONObject().put("success", true)
  }

  fun createMenuItemToppingMapping(payload: JSONObject): JSONObject {
    val newMapping = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("menu_item_id", payload.optString("menu_item_id"))
      .put("topping_group_id", payload.optString("topping_group_id"))
    val arr = readArray(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON)
    arr.put(newMapping)
    persistArray(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON, arr)
    return newMapping
  }

  fun deleteMenuItemToppingMapping(id: String): JSONObject {
    val arr = readArray(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON)
    val newArr = JSONArray()
    var found = false
    for (i in 0 until arr.length()) {
      val e = arr.optJSONObject(i) ?: continue
      if (e.optString("id") == id) { found = true; continue }
      newArr.put(e)
    }
    if (!found) throw IllegalArgumentException("Mapping not found")
    persistArray(PREF_NATIVE_MENU_ITEM_TOPPING_MAPPINGS_JSON, newArr)
    return JSONObject().put("success", true)
  }

  fun createMenuCategoryToppingMapping(payload: JSONObject): JSONObject {
    val newMapping = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("menu_category_id", payload.optString("menu_category_id"))
      .put("topping_group_id", payload.optString("topping_group_id"))
    val arr = readArray(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON)
    arr.put(newMapping)
    persistArray(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON, arr)
    return newMapping
  }

  fun deleteMenuCategoryToppingMapping(id: String): JSONObject {
    val arr = readArray(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON)
    val newArr = JSONArray()
    var found = false
    for (i in 0 until arr.length()) {
      val e = arr.optJSONObject(i) ?: continue
      if (e.optString("id") == id) { found = true; continue }
      newArr.put(e)
    }
    if (!found) throw IllegalArgumentException("Mapping not found")
    persistArray(PREF_NATIVE_MENU_CATEGORY_TOPPING_MAPPINGS_JSON, newArr)
    return JSONObject().put("success", true)
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

  private fun computeShiftSummary(shiftId: String): JSONObject {
    val orders = readArray(PREF_NATIVE_ORDERS_JSON)
    var totalOrders = 0
    var totalItems = 0
    var totalRevenue = 0
    var voidedOrders = 0
    var voidedItems = 0
    var voidedAmount = 0
    val pBreakdown = JSONObject()

    for (i in 0 until orders.length()) {
      val o = orders.optJSONObject(i) ?: continue
      if (o.optString("shift_id") == shiftId) {
        val status = o.optString("status")
        if (status == "completed") {
          totalOrders++
          totalItems += o.optInt("total_items", 0)
          val amount = o.optInt("total_amount", 0)
          totalRevenue += amount
          
          val payment = o.optJSONObject("payment")
          val pType = payment?.optString("payment_type", "cash") ?: "cash"
          pBreakdown.put(pType, pBreakdown.optInt(pType, 0) + amount)
        } else if (status == "voided") {
          voidedOrders++
          voidedItems += o.optInt("total_items", 0)
          voidedAmount += o.optInt("total_amount", 0)
        }
      }
    }

    return JSONObject()
      .put("total_orders", totalOrders)
      .put("total_items", totalItems)
      .put("total_revenue", totalRevenue)
      .put("voided_orders", voidedOrders)
      .put("voided_items", voidedItems)
      .put("voided_amount", voidedAmount)
      .put("payment_breakdown", pBreakdown)
  }

  private fun computeDaySummary(date: String): JSONObject {
    val shifts = readShifts()
    val shiftSummaries = JSONArray()
    var totalOrders = 0
    var totalItems = 0
    var totalRevenue = 0
    var voidedOrders = 0
    var voidedItems = 0
    var voidedAmount = 0
    val pBreakdown = JSONObject()

    for (i in 0 until shifts.length()) {
      val s = shifts.optJSONObject(i) ?: continue
      if (s.optString("date") == date) {
        val summary = computeShiftSummary(s.optString("id"))
        shiftSummaries.put(JSONObject(s.toString()).put("summary", summary))
        
        totalOrders += summary.optInt("total_orders")
        totalItems += summary.optInt("total_items")
        totalRevenue += summary.optInt("total_revenue")
        voidedOrders += summary.optInt("voided_orders")
        voidedItems += summary.optInt("voided_items")
        voidedAmount += summary.optInt("voided_amount")
        
        val p = summary.optJSONObject("payment_breakdown") ?: JSONObject()
        val keys = p.keys()
        while (keys.hasNext()) {
          val k = keys.next()
          pBreakdown.put(k, pBreakdown.optInt(k, 0) + p.optInt(k))
        }
      }
    }

    return JSONObject()
      .put("date", date)
      .put("shifts", shiftSummaries)
      .put("total_orders", totalOrders)
      .put("total_items", totalItems)
      .put("total_revenue", totalRevenue)
      .put("voided_orders", voidedOrders)
      .put("voided_items", voidedItems)
      .put("voided_amount", voidedAmount)
      .put("payment_breakdown", pBreakdown)
  }

  fun readShifts(): JSONArray {
    val shifts = readArray(PREF_NATIVE_SHIFTS_JSON)
    val staff = readStaff()

    val enriched = JSONArray()
    for (i in 0 until shifts.length()) {
      val shift = shifts.optJSONObject(i) ?: continue
      val staffId = shift.optString("staff_id")

      // Find staff details
      var staffObj: JSONObject? = null
      for (j in 0 until staff.length()) {
        val s = staff.optJSONObject(j) ?: continue
        if (s.optString("id") == staffId) {
          staffObj = s
          break
        }
      }

      val enrichedShift = JSONObject(shift.toString())
        .put("staff", staffObj ?: JSONObject.NULL)
        .put("staff_name", staffObj?.optString("name") ?: "")
      enriched.put(enrichedShift)
    }
    return enriched
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
    val orders = readArray(PREF_NATIVE_ORDERS_JSON)
    val staff = readStaff()
    val catalogItems = readArray(PREF_NATIVE_MENU_ITEMS_JSON)

    val enriched = JSONArray()
    for (i in 0 until orders.length()) {
      val order = orders.optJSONObject(i) ?: continue
      val staffId = order.optString("staff_id")

      // Find staff name
      var staffName = ""
      for (j in 0 until staff.length()) {
        val s = staff.optJSONObject(j) ?: continue
        if (s.optString("id") == staffId) {
          staffName = s.optString("name")
          break
        }
      }

      val enrichedOrder = JSONObject(order.toString()).put("staff_name", staffName)
      
      // Enrich items with names if missing
      val items = enrichedOrder.optJSONArray("items") ?: JSONArray()
      for (k in 0 until items.length()) {
        val item = items.optJSONObject(k) ?: continue
        if (item.optString("menu_item_name").isBlank()) {
          val itemId = item.optString("menu_item_id")
          for (l in 0 until catalogItems.length()) {
            val catalogItem = catalogItems.optJSONObject(l) ?: continue
            if (catalogItem.optString("id") == itemId) {
              item.put("menu_item_name", catalogItem.optString("name"))
              break
            }
          }
        }
      }

      enriched.put(enrichedOrder)
    }
    return enriched
  }

  fun createOrder(payload: JSONObject): JSONObject {
    Log.i("NativeConfigStore", "createOrder called")
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
    Log.i("NativeConfigStore", "payOrder called for orderId=$orderId")
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
    
    // Cloud Sync trigger
    checkAndTriggerMiniBatch(updatedOrder!!.optString("shift_id"))

    // Trigger Telegram report
    enqueuePendingAction(ACTION_TYPE_ORDER_REPORT, JSONObject()
      .put("order_id", orderId)
      .put("status", "completed")
      .put("timestamp", now))
      
    return updatedOrder
  }

  private fun checkAndTriggerMiniBatch(shiftId: String) {
    val cloudSettings = readCloudSyncSettings()
    Log.d("NativeConfigStore", "Checking mini-batch trigger. Cloud settings: $cloudSettings")
    
    if (!cloudSettings.optBoolean("enabled", false)) {
        Log.d("NativeConfigStore", "Mini-batch trigger skipped: Cloud sync disabled.")
        return
    }

    val orders = readOrders()
    var unsyncedCount = 0
    for (i in 0 until orders.length()) {
      val o = orders.optJSONObject(i) ?: continue
      val oShiftId = o.optString("shift_id")
      val hasSyncAt = o.has("cloud_sync_at")
      val status = o.optString("status")
      
      if (oShiftId == shiftId && !hasSyncAt && (status == "completed" || status == "voided")) {
        unsyncedCount++
      }
    }

    val batchSize = cloudSettings.optInt("mini_batch_size", 20)
    Log.i("NativeConfigStore", "Unsynced finalized orders for shift $shiftId: $unsyncedCount (Threshold: $batchSize)")
    
    if (unsyncedCount >= batchSize) {
      Log.i("NativeConfigStore", "Threshold reached! Enqueuing mini-batch job.")
      enqueueSyncJob(SYNC_JOB_TYPE_MINI_BATCH, shiftId)
    }
  }

  fun voidOrder(orderId: String, payload: JSONObject): JSONObject {
    Log.i("NativeConfigStore", "voidOrder called for orderId=$orderId")
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
    
    // Cloud Sync trigger
    checkAndTriggerMiniBatch(updatedOrder!!.optString("shift_id"))

    // Trigger Telegram report
    enqueuePendingAction(ACTION_TYPE_ORDER_REPORT, JSONObject()
      .put("order_id", orderId)
      .put("status", "voided")
      .put("timestamp", now))

    return updatedOrder
  }

  fun printReceipt(orderId: String, mode: String): JSONObject {
    Log.i("NativeConfigStore", "printReceipt entered: orderId=$orderId, mode=$mode")
    val current = readOrders()
    val allowReprint = mode == "reprint"

    val target = findOrderById(current, orderId)
    if (target == null) {
      Log.e("NativeConfigStore", "printReceipt failed: Order $orderId not found in ${current.length()} orders")
      throw IllegalArgumentException("Order not found: $orderId")
    }

    Log.d("NativeConfigStore", "printReceipt: Found order $orderId with status=${target.optString("status")} and print_count=${target.optInt("print_count")}")

    if (target.optString("status") != "completed") {
      Log.e("NativeConfigStore", "printReceipt failed: Order $orderId status is ${target.optString("status")}, not completed")
      throw IllegalStateException("Cannot print receipt for non-completed order")
    }

    if (!allowReprint && target.optInt("print_count", 0) > 0) {
      Log.w("NativeConfigStore", "Preventing duplicate print in printReceipt for order: $orderId. Current print_count: ${target.optInt("print_count")}")
      return JSONObject(target.toString())
        .put("duplicate_print_prevented", true)
        .put("print_job", JSONObject.NULL)
    }

    val job = enqueuePrintJob(orderId, if (allowReprint) "reprint" else "initial")
    val processResult = processPrintQueue("inline", 20)
    val latest = findOrderById(readOrders(), orderId)
      ?: throw IllegalArgumentException("Order not found after print processing: $orderId")

    return JSONObject(latest.toString())
      .put("print_job", job)
      .put("print_queue", processResult)
  }

  fun processPrintQueue(context: String = "manual", maxAttemptsPerRun: Int = 20): JSONObject {
    if (!printLock.tryLock()) {
      Log.i("NativeConfigStore", "processPrintQueue: Already running in another thread, skipping (context: $context)")
      return JSONObject().put("status", "already_running")
    }
    
    try {
      val runId = (100..999).random()
      Log.i("NativeConfigStore", "[$runId] processPrintQueue started. Context: $context")
      val cappedAttempts = maxAttemptsPerRun.coerceIn(1, 500)

      var processed = 0
      var succeeded = 0
      var retried = 0
      var deadLettered = 0
      var duplicatePrevented = 0

      // We process jobs one by one, re-reading the queue each time to be thread-safe
      // and ensure we don't overwrite new jobs enqueued during processing.
      while (processed < cappedAttempts) {
        val now = System.currentTimeMillis()
        var jobToProcess: JSONObject? = null

        synchronized(globalFileLock) {
          val queue = readPrintQueue()
          for (i in 0 until queue.length()) {
            val job = queue.optJSONObject(i) ?: continue
            val status = job.optString("status")
            val nextAttemptAt = job.optLong("next_attempt_at", 0L)
            
            if ((status == PRINT_JOB_PENDING || status == PRINT_JOB_RETRYING) && nextAttemptAt <= now) {
              jobToProcess = JSONObject(job.toString())
              
              // Mark as processing immediately and persist
              jobToProcess!!.put("status", PRINT_JOB_PROCESSING).put("updated_at", now)
              queue.put(i, jobToProcess)
              persistPrintQueue(queue)
              break
            }
          }
        }

        if (jobToProcess == null) {
          Log.d("NativeConfigStore", "[$runId] No more eligible jobs in queue.")
          break 
        }

        val jobId = jobToProcess!!.optString("id")
        Log.i("NativeConfigStore", "[$runId] Processing job: $jobId")

        try {
          val mode = jobToProcess!!.optString("mode", "initial")
          val orderId = jobToProcess!!.optString("order_id")
          val order = findOrderById(readOrders(), orderId)
            ?: throw IllegalStateException("Order not found: $orderId")

          if (order.optString("status") != "completed" && order.optString("status") != "voided") {
            throw IllegalStateException("Invalid order status: ${order.optString("status")}")
          }

          if (mode == "initial" && order.optInt("print_count", 0) > 0) {
            Log.w("NativeConfigStore", "[$runId] Skipping duplicate print for order $orderId")
            finalizeJobStatus(jobId, PRINT_JOB_DUPLICATE_PREVENTED, null)
            duplicatePrevented++
          } else {
            validatePrinterTarget(jobToProcess!!)
            
            val variant = if (order.optString("status") == "voided") "VOID" else "INTERNAL"
            var copyCount = 1
            val settings = readSettings()
            for (i in 0 until settings.length()) {
              val s = settings.optJSONObject(i) ?: continue
              if (s.optString("key") == "receipt.copies") {
                val v = s.optJSONObject("value")
                if (v?.optInt("version") == 1) {
                  val copiesArr = v.optJSONArray("copies") ?: JSONArray()
                  for (j in 0 until copiesArr.length()) {
                    val c = copiesArr.optJSONObject(j) ?: continue
                    if (c.optString("variant") == variant) {
                      copyCount = c.optInt("count", 1)
                      break
                    }
                  }
                }
                break
              }
            }

            val store = readStore()
            val language = store.optString("language", "en")
            val currency = store.optString("currency", "KHR")
            val payload = ReceiptRenderer.renderOrder(order, variant, language, currency)

            val host = jobToProcess!!.optString("host")
            val port = jobToProcess!!.optInt("port", 9100)
            
            repeat(copyCount.coerceAtLeast(1)) {
              PrinterTransport.sendRawBytes(host, port, payload)
            }

            incrementOrderPrint(orderId, now)
            finalizeJobStatus(jobId, PRINT_JOB_SUCCEEDED, null)
            succeeded++
          }
        } catch (error: Exception) {
          val message = error.message ?: "Unknown error"
          Log.e("NativeConfigStore", "[$runId] Job $jobId failed: $message")
          
          val attempts = jobToProcess!!.optInt("attempt_count", 0) + 1
          val maxAttempts = jobToProcess!!.optInt("max_attempts", DEFAULT_MAX_PRINT_ATTEMPTS)

          if (attempts >= maxAttempts) {
            finalizeJobStatus(jobId, PRINT_JOB_DEAD_LETTER, message, attempts)
            deadLettered++
          } else {
            val backoffMs = computeBackoffMs(attempts)
            finalizeJobStatus(jobId, PRINT_JOB_RETRYING, message, attempts, now + backoffMs)
            retried++
          }
        }
        processed++
      }

      return JSONObject()
        .put("context", context)
        .put("processed", processed)
        .put("succeeded", succeeded)
        .put("retried", retried)
        .put("dead_lettered", deadLettered)
        .put("duplicate_prevented", duplicatePrevented)
        .put("summary", getPrintQueueStatus())
    } finally {
      printLock.unlock()
    }
  }

  private fun finalizeJobStatus(
    jobId: String, 
    status: String, 
    error: String?, 
    attempts: Int? = null, 
    nextAttemptAt: Long? = null
  ) {
    synchronized(globalFileLock) {
      val queue = readPrintQueue()
      val now = System.currentTimeMillis()
      for (i in 0 until queue.length()) {
        val job = queue.optJSONObject(i) ?: continue
        if (job.optString("id") == jobId) {
          val updated = JSONObject(job.toString())
            .put("status", status)
            .put("updated_at", now)
          
          if (error != null) updated.put("last_error", error)
          if (attempts != null) updated.put("attempt_count", attempts)
          if (nextAttemptAt != null) updated.put("next_attempt_at", nextAttemptAt)
          else if (status == PRINT_JOB_SUCCEEDED || status == PRINT_JOB_DUPLICATE_PREVENTED) {
             updated.put("next_attempt_at", 0L)
          }

          queue.put(i, updated)
          persistPrintQueue(queue)
          return
        }
      }
    }
  }

  fun getPrintQueueStatus(): JSONObject {
    val queue = readPrintQueue()
    var pending = 0
    var retrying = 0
    var processing = 0
    var succeeded = 0
    var duplicatePrevented = 0
    var deadLetter = 0
    var nextAttemptAt: Long? = null

    for (index in 0 until queue.length()) {
      val job = queue.optJSONObject(index) ?: continue
      when (job.optString("status")) {
        PRINT_JOB_PENDING -> pending += 1
        PRINT_JOB_RETRYING -> {
          retrying += 1
          val candidate = job.optLong("next_attempt_at", 0L)
          if (candidate > 0 && (nextAttemptAt == null || candidate < nextAttemptAt)) {
            nextAttemptAt = candidate
          }
        }
        PRINT_JOB_PROCESSING -> processing += 1
        PRINT_JOB_SUCCEEDED -> succeeded += 1
        PRINT_JOB_DUPLICATE_PREVENTED -> duplicatePrevented += 1
        PRINT_JOB_DEAD_LETTER -> deadLetter += 1
      }
    }

    return JSONObject()
      .put("total_jobs", queue.length())
      .put("pending_jobs", pending)
      .put("retrying_jobs", retrying)
      .put("processing_jobs", processing)
      .put("succeeded_jobs", succeeded)
      .put("duplicate_prevented_jobs", duplicatePrevented)
      .put("dead_letter_jobs", deadLetter)
      .put("next_attempt_at", nextAttemptAt ?: JSONObject.NULL)
  }

  private fun enqueuePrintJob(orderId: String, mode: String): JSONObject {
    synchronized(globalFileLock) {
        Log.i("NativeConfigStore", "enqueuePrintJob called: orderId=$orderId, mode=$mode")
        val now = System.currentTimeMillis()
        val queue = readPrintQueue()
        val settings = resolvePrinterNetworkSettings()

        val normalizedMode = if (mode == "reprint") "reprint" else "initial"
        val jobId = if (normalizedMode == "initial") {
          "print-initial-$orderId"
        } else {
          "print-reprint-$orderId-$now"
        }

        if (normalizedMode == "initial") {
          for (index in 0 until queue.length()) {
            val existing = queue.optJSONObject(index) ?: continue
            if (existing.optString("id") == jobId) {
              val status = existing.optString("status")
              Log.d("NativeConfigStore", "Found existing initial job for order $orderId with status: $status")
              
              if (status == PRINT_JOB_SUCCEEDED || status == PRINT_JOB_DUPLICATE_PREVENTED || status == PRINT_JOB_PROCESSING) {
                Log.i("NativeConfigStore", "Skipping enqueue: Job already exists in state $status for order $orderId")
                return existing
              }

              Log.i("NativeConfigStore", "Resetting existing failed/pending job to pending for order $orderId")
              val reset = JSONObject(existing.toString())
                .put("status", PRINT_JOB_PENDING)
                .put("attempt_count", 0)
                .put("next_attempt_at", now)
                .put("last_error", JSONObject.NULL)
                .put("updated_at", now)
              queue.put(index, reset)
              persistPrintQueue(queue)
              return reset
            }
          }
        }

        val job = JSONObject()
          .put("id", jobId)
          .put("order_id", orderId)
          .put("mode", normalizedMode)
          .put("status", PRINT_JOB_PENDING)
          .put("connection_method", settings.optString("connection_method", "lan"))
          .put("host", settings.optString("host", ""))
          .put("port", settings.optInt("port", 9100))
          .put("attempt_count", 0)
          .put("max_attempts", DEFAULT_MAX_PRINT_ATTEMPTS)
          .put("next_attempt_at", now)
          .put("last_error", JSONObject.NULL)
          .put("created_at", now)
          .put("updated_at", now)

        queue.put(job)
        Log.i("NativeConfigStore", "enqueuePrintJob: Job enqueued. New queue size: ${queue.length()}. JobID: $jobId")
        persistPrintQueue(queue)
        return job
    }
  }

  private fun resolvePrinterNetworkSettings(): JSONObject {
    val settings = readSettings()
    for (index in 0 until settings.length()) {
      val setting = settings.optJSONObject(index) ?: continue
      if (setting.optString("key") == "printer.lan") {
        val raw = setting.opt("value")
        return when (raw) {
          is JSONObject -> raw
          else -> JSONObject()
        }
      }
    }

    return JSONObject()
      .put("enabled", false)
      .put("connection_method", "lan")
      .put("host", "")
      .put("port", 9100)
  }

  private fun validatePrinterTarget(job: JSONObject) {
    val host = job.optString("host", "").trim()
    val port = job.optInt("port", 9100)
    if (host.isBlank()) {
      throw IllegalStateException("Printer host is not configured")
    }
    if (port <= 0 || port > 65535) {
      throw IllegalStateException("Printer port is out of range")
    }
  }

  private fun incrementOrderPrint(orderId: String, now: Long) {
    synchronized(globalFileLock) {
        Log.d("NativeConfigStore", "Incrementing print count for order: $orderId")
        val current = readOrders()
        val updated = JSONArray()
        var found = false

        for (index in 0 until current.length()) {
          val order = current.optJSONObject(index) ?: continue
          if (order.optString("id") == orderId) {
            val merged = JSONObject(order.toString())
              .put("last_printed_at", now)
              .put("print_count", order.optInt("print_count", 0) + 1)
              .put("duplicate_print_prevented", false)
            updated.put(merged)
            found = true
            Log.i("NativeConfigStore", "New print count for $orderId: ${merged.optInt("print_count")}")
          } else {
            updated.put(order)
          }
        }

        if (!found) {
          throw IllegalStateException("Order not found while updating print state: $orderId")
        }

        persistOrders(updated)
    }
  }

  private fun findShiftById(shifts: JSONArray, shiftId: String): JSONObject? {
    for (index in 0 until shifts.length()) {
      val shift = shifts.optJSONObject(index) ?: continue
      if (shift.optString("id") == shiftId) {
        return shift
      }
    }
    return null
  }

  private fun findOrderById(orders: JSONArray, orderId: String): JSONObject? {
    for (index in 0 until orders.length()) {
      val order = orders.optJSONObject(index) ?: continue
      if (order.optString("id") == orderId) {
        return order
      }
    }

    return null
  }

  private fun computeBackoffMs(attempt: Int): Long {
    val exponent = attempt.coerceAtMost(6)
    return (1L shl exponent) * 1_000L
  }

  private fun readPrintQueue(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_PRINT_QUEUE_JSON, null) ?: return JSONArray()

    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      val fallback = JSONArray()
      preferences.edit().putString(PREF_NATIVE_PRINT_QUEUE_JSON, fallback.toString()).apply()
      fallback
    }
  }

  fun createStaff(payload: JSONObject): JSONObject {
    val now = System.currentTimeMillis()
    val newStaff = JSONObject()
      .put("id", UUID.randomUUID().toString())
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
    
    // Trigger Cloud Sync Flush
    Log.i("NativeConfigStore", "Shift $shiftId closed. Enqueuing full cloud sync flush.")
    enqueueSyncJob(SYNC_JOB_TYPE_FLUSH, shiftId)
    
    // Enqueue background report action
    enqueuePendingAction(ACTION_TYPE_SHIFT_REPORT, JSONObject()
      .put("shift_id", shiftId)
      .put("action", "close")
      .put("timestamp", now))

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

    // Cloud Sync trigger for all closed shifts
    for (i in 0 until updated.length()) {
        val s = updated.optJSONObject(i) ?: continue
        if (s.optString("status") == "closed" && s.optLong("ended_at") == now) {
            enqueueSyncJob(SYNC_JOB_TYPE_FLUSH, s.optString("id"))
        }
    }

    // Enqueue background report action
    val dateStr = LocalDate.now().toString()
    enqueuePendingAction(ACTION_TYPE_DAY_CLOSE_REPORT, JSONObject()
      .put("action", "day_close")
      .put("date", dateStr)
      .put("closed_count", closedCount)
      .put("timestamp", now))

    return JSONObject()
      .put("message", "Closed $closedCount shift(s).")
      .put("closed_count", closedCount)
      .put("date", dateStr)
  }

  fun readCloudSyncSettings(): JSONObject {
    val settings = readSettings()
    for (index in 0 until settings.length()) {
      val setting = settings.optJSONObject(index) ?: continue
      if (setting.optString("key") == "cloud.sync") {
        val config = setting.optJSONObject("value") ?: JSONObject()
        Log.i("NativeConfigStore", "Read Cloud Sync Settings: $config")
        return config
      }
    }
    return JSONObject()
  }

  fun updateCloudSyncSettings(payload: JSONObject): JSONObject {
    Log.i("NativeConfigStore", "Updating cloud sync settings: $payload")
    // If the payload doesn't have a "value" key, it's likely just the inner config object.
    // We should wrap it correctly for upsertSetting.
    return if (payload.has("value")) {
      upsertSetting("cloud.sync", payload).optJSONObject("value") ?: JSONObject()
    } else {
      val wrapper = JSONObject()
        .put("value", payload)
        .put("value_type", "json")
        .put("category", "Cloud Sync")
        .put("description", "Cloud ingestion configuration")
      upsertSetting("cloud.sync", wrapper).optJSONObject("value") ?: JSONObject()
    }
  }

  fun performCloudHandshake(tempSettings: JSONObject): JSONObject {
    Log.i("NativeConfigStore", "Performing cloud handshake with: $tempSettings")
    
    // Support both direct and wrapped payloads
    val config = if (tempSettings.has("value")) tempSettings.optJSONObject("value") ?: tempSettings else tempSettings
    
    val apiKey = config.optString("api_key").trim()
    var baseUrl = config.optString("base_url").trim()

    if (apiKey.isBlank() || baseUrl.isBlank()) {
      Log.e("NativeConfigStore", "Handshake failed: API Key or Base URL is blank. API Key present: ${apiKey.isNotBlank()}, Base URL present: ${baseUrl.isNotBlank()}")
      throw IllegalStateException("API Key and Base URL are required for handshake")
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1)
    }

    val endpoint = "$baseUrl/pos/handshake"
    var connection: java.net.HttpURLConnection? = null
    try {
      val url = java.net.URL(endpoint)
      connection = url.openConnection() as java.net.HttpURLConnection
      connection.requestMethod = "POST"
      connection.doOutput = true
      connection.connectTimeout = 15000
      connection.readTimeout = 15000
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("X-Api-Key", apiKey)

      java.io.OutputStreamWriter(connection.outputStream).use { it.write("{}") }

      val responseCode = connection.responseCode
      if (responseCode !in 200..299) {
        val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: "No error body"
        throw Exception("Handshake failed ($responseCode): $errorBody")
      }

      val responseBody = connection.inputStream.bufferedReader().readText()
      Log.d("NativeConfigStore", "Handshake response: $responseBody")
      val responseJson = JSONObject(responseBody)
      val data = responseJson.optJSONObject("data") ?: responseJson
      val storeClient = data.optJSONObject("store_client") ?: data

      // Try to find the canonical Store ID. 
      // We prioritize:
      // 1. data.store.id (Found in logs)
      // 2. data.store_id (Spec)
      // 3. data.store_client.id (Spec)
      val storeObjId = data.optJSONObject("store")?.optString("id", "") ?: ""
      val rootStoreId = data.optString("store_id", "")
      val clientStoreId = storeClient.optString("id", "")
      
      val storeId = if (storeObjId.isNotBlank()) storeObjId 
                    else if (rootStoreId.isNotBlank()) rootStoreId 
                    else clientStoreId
      
      if (storeId.isBlank()) {
        Log.e("NativeConfigStore", "Handshake failed: No store_id found in response. storeObjId: '$storeObjId', rootStoreId: '$rootStoreId', clientStoreId: '$clientStoreId'")
        throw Exception("Handshake response missing store_id")
      }

      Log.i("NativeConfigStore", "Handshake successful! Resolved Store ID: $storeId (from obj: '$storeObjId', from root: '$rootStoreId', from client: '$clientStoreId')")

      val updatedConfig = JSONObject(config.toString())
        .put("store_id", storeId)
        .put("store_linked_at", storeClient.opt("linked_at") ?: JSONObject.NULL)
        .put("store_client_name", storeClient.opt("name") ?: JSONObject.NULL)
        .put("store_last_seen_at", storeClient.opt("last_seen_at") ?: JSONObject.NULL)

      updateCloudSyncSettings(updatedConfig)
      
      // Clear the sync queue on successful handshake to reset any backoff-delayed jobs
      persistSyncQueue(JSONArray())

      return updatedConfig
    } finally {
      connection?.disconnect()
    }
  }

  fun readSyncQueue(): JSONArray = readArray(PREF_NATIVE_SYNC_QUEUE_JSON)

  fun persistSyncQueue(queue: JSONArray) = persistArray(PREF_NATIVE_SYNC_QUEUE_JSON, queue)

  fun enqueueSyncJob(type: String, shiftId: String): Boolean {
    val queue = readSyncQueue()
    for (i in 0 until queue.length()) {
      val job = queue.optJSONObject(i) ?: continue
      if (job.optString("type") == type && job.optString("shiftId") == shiftId) {
        return false
      }
    }

    val now = java.time.OffsetDateTime.now().toString()
    val job = JSONObject()
      .put("id", UUID.randomUUID().toString())
      .put("type", type)
      .put("shiftId", shiftId)
      .put("created_at", now)
      .put("last_attempt_at", JSONObject.NULL)
      .put("retry_count", 0)
      .put("next_attempt_at", now)

    queue.put(job)
    persistSyncQueue(queue)
    
    // Trigger worker
    triggerCloudSyncWorker()
    
    return true
  }

  private fun triggerCloudSyncWorker() {
    try {
      val workManager = WorkManager.getInstance(context)
      val syncRequest = OneTimeWorkRequestBuilder<CloudSyncWorker>()
        .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
        .build()
      workManager.enqueueUniqueWork("cloud-sync-immediate", ExistingWorkPolicy.REPLACE, syncRequest)
    } catch (e: Exception) {
      Log.w("NativeConfigStore", "Failed to trigger CloudSyncWorker: ${e.message}")
    }
  }

  fun markOrderAsSynced(orderId: String) {
    Log.d("NativeConfigStore", "Marking order $orderId as synced")
    val current = readOrders()
    val updated = JSONArray()
    val now = System.currentTimeMillis()
    var found = false

    for (index in 0 until current.length()) {
      val order = current.optJSONObject(index) ?: continue
      if (order.optString("id") == orderId) {
        order.put("cloud_sync_at", now)
        found = true
        Log.v("NativeConfigStore", "Updated cloud_sync_at for $orderId")
      }
      updated.put(order)
    }

    if (found) {
      persistOrders(updated)
      Log.i("NativeConfigStore", "Order $orderId persisted as synced.")
    } else {
      Log.w("NativeConfigStore", "Could not find order $orderId to mark as synced!")
    }
  }

  fun getUnsyncedOrders(shiftId: String, limit: Int): List<JSONObject> {
    val orders = readOrders()
    val result = mutableListOf<JSONObject>()
    Log.d("NativeConfigStore", "Searching for up to $limit unsynced orders in shift $shiftId. Total orders in store: ${orders.length()}")
    
    for (i in 0 until orders.length()) {
      val o = orders.optJSONObject(i) ?: continue
      val oShiftId = o.optString("shift_id")
      val hasSyncAt = o.has("cloud_sync_at")
      val status = o.optString("status")

      if (oShiftId == shiftId && !hasSyncAt && (status == "completed" || status == "voided")) {
        result.add(o)
        if (result.size >= limit) break
      }
    }
    Log.i("NativeConfigStore", "Found ${result.size} unsynced orders for shift $shiftId")
    return result
  }

  fun createCloudEventBatch(shiftId: String, source: String): String {
    val settings = readCloudSyncSettings()
    val apiKey = settings.optString("api_key").trim()
    val baseUrl = settings.optString("base_url").trim().removeSuffix("/")
    val storeId = settings.optString("store_id").trim()
    
    val shift = findShiftById(readShifts(), shiftId) ?: throw Exception("Shift not found")
    
    val endpoint = "$baseUrl/stores/$storeId/event_batches"
    val payload = JSONObject().put("event_batch", JSONObject()
      .put("business_date", shift.optString("date"))
      .put("source", source))
      
    val response = performCloudRequest("POST", endpoint, apiKey, payload.toString())
    val data = response.optJSONObject("data") ?: response
    val batchId = data.optJSONObject("event_batch")?.optString("id") ?: data.optString("id")
    if (batchId.isNullOrBlank()) throw Exception("Batch creation failed: ID missing")
    return batchId
  }

  fun uploadCloudEvent(batchId: String, event: JSONObject) {
    val settings = readCloudSyncSettings()
    val apiKey = settings.optString("api_key").trim()
    val baseUrl = settings.optString("base_url").trim().removeSuffix("/")
    val storeId = settings.optString("store_id").trim()
    
    val endpoint = "$baseUrl/stores/$storeId/event_batches/$batchId/events"
    performCloudRequest("POST", endpoint, apiKey, event.toString())
  }

  private fun performCloudRequest(method: String, endpoint: String, apiKey: String, body: String): JSONObject {
    Log.i("NativeConfigStore", "Cloud Request: $method $endpoint")
    val maskedKey = if (apiKey.length > 8) apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4) else "****"
    Log.d("NativeConfigStore", "API Key: $maskedKey")
    Log.d("NativeConfigStore", "Request Body: $body")
    
    var connection: java.net.HttpURLConnection? = null
    try {
      val url = java.net.URL(endpoint)
      connection = url.openConnection() as java.net.HttpURLConnection
      connection.requestMethod = method
      connection.doOutput = true
      connection.connectTimeout = 15000
      connection.readTimeout = 15000
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("X-Api-Key", apiKey)

      java.io.OutputStreamWriter(connection.outputStream).use { it.write(body) }

      val responseCode = connection.responseCode
      Log.i("NativeConfigStore", "Cloud Response Code: $responseCode")
      
      if (responseCode !in 200..299) {
        val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: "No error body"
        Log.e("NativeConfigStore", "Cloud Request Failed ($responseCode): $errorBody")
        throw Exception("Cloud request failed ($responseCode): $errorBody")
      }

      val responseBody = connection.inputStream.bufferedReader().readText()
      Log.d("NativeConfigStore", "Cloud Response Body: $responseBody")
      return JSONObject(responseBody)
    } catch (e: Exception) {
      Log.e("NativeConfigStore", "Cloud Request Exception: ${e.message}")
      throw e
    } finally {
      connection?.disconnect()
    }
  }

  fun updateStore(payload: JSONObject): JSONObject {
    val current = readStore()
    val merged = JSONObject(current.toString())
    val keys = payload.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      merged.put(key, payload.get(key))
    }
    getPreferences().edit().putString(PREF_NATIVE_STORE_JSON, merged.toString()).apply()
    return merged
  }

  fun upsertSetting(key: String, payload: JSONObject): JSONObject {
    val settings = readSettings()
    val updated = JSONArray()
    var found = false
    var updatedSetting: JSONObject? = null

    for (i in 0 until settings.length()) {
      val setting = settings.optJSONObject(i) ?: continue
      if (setting.optString("key") == key) {
        val merged = JSONObject(setting.toString())
        val payloadKeys = payload.keys()
        while (payloadKeys.hasNext()) {
          val k = payloadKeys.next()
          // Special case: if we are updating "value", replace it instead of merging fields into root
          merged.put(k, payload.get(k))
        }
        updated.put(merged)
        updatedSetting = merged
        found = true
      } else {
        updated.put(setting)
      }
    }

    if (!found) {
      val newSetting = JSONObject(payload.toString()).put("key", key)
      if (!newSetting.has("id")) {
        newSetting.put("id", UUID.randomUUID().toString())
      }
      updated.put(newSetting)
      updatedSetting = newSetting
    }

    getPreferences().edit().putString(PREF_NATIVE_SETTINGS_JSON, updated.toString()).apply()
    return updatedSetting!!
  }

  fun verifyStaffCredentials(name: String, password: String): JSONObject? {
    val staff = readStaff()
    for (i in 0 until staff.length()) {
      val entry = staff.optJSONObject(i) ?: continue
      if (entry.optString("name") == name && entry.optString("password") == password) {
        return entry
      }
    }
    return null
  }

  fun initialize(payload: JSONObject): JSONObject {
    val admin = payload.optJSONObject("admin_user") ?: throw IllegalArgumentException("admin_user is required")
    val store = payload.optJSONObject("store") ?: throw IllegalArgumentException("store is required")

    // 1. Setup Admin
    createStaff(JSONObject()
      .put("name", admin.optString("name"))
      .put("password", admin.optString("password"))
      .put("role", "admin")
      .put("status", "active"))

    // 2. Setup Store
    val currentStore = readStore()
    val updatedStore = JSONObject(currentStore.toString())
      .put("name", store.optString("name"))
      .put("language", store.optString("language", "en"))
      .put("currency", store.optString("currency", "KHR"))
    
    getPreferences().edit()
      .putString(PREF_NATIVE_STORE_JSON, updatedStore.toString())
      .putBoolean(PREF_SYSTEM_INITIALIZED, true)
      .apply()

    return JSONObject().put("message", "Setup completed")
  }

  fun resetAllData() {
    getPreferences().edit().clear().apply()
  }

  private fun getPreferences() =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  fun getContext(): Context = context

  private fun readArray(key: String): JSONArray {
    val raw = getPreferences().getString(key, null) ?: return JSONArray()
    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  private fun persistArray(key: String, data: JSONArray) {
    getPreferences().edit().putString(key, data.toString()).apply()
  }

  private fun persistShifts(shifts: JSONArray) {
    persistArray(PREF_NATIVE_SHIFTS_JSON, shifts)
  }

  private fun persistStaff(staff: JSONArray) {
    persistArray(PREF_NATIVE_STAFF_JSON, staff)
  }

  private fun persistOrders(orders: JSONArray) {
    persistArray(PREF_NATIVE_ORDERS_JSON, orders)
  }

  private fun persistPrintQueue(queue: JSONArray) {
    persistArray(PREF_NATIVE_PRINT_QUEUE_JSON, queue)
  }

  fun readPendingActions(): JSONArray {
    val preferences = getPreferences()
    val raw = preferences.getString(PREF_NATIVE_PENDING_ACTIONS_JSON, null) ?: return JSONArray()
    return try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
  }

  fun persistPendingActions(actions: JSONArray) {
    getPreferences().edit().putString(PREF_NATIVE_PENDING_ACTIONS_JSON, actions.toString()).apply()
  }

  fun enqueuePendingAction(type: String, payload: JSONObject): JSONObject {
    val now = System.currentTimeMillis()
    val actions = readPendingActions()
    val actionId = "action-$type-$now-${(1000..9999).random()}"

    val action = JSONObject()
      .put("id", actionId)
      .put("type", type)
      .put("status", ACTION_STATUS_PENDING)
      .put("payload", payload)
      .put("attempt_count", 0)
      .put("max_attempts", DEFAULT_MAX_PRINT_ATTEMPTS)
      .put("next_attempt_at", now)
      .put("last_error", JSONObject.NULL)
      .put("created_at", now)
      .put("updated_at", now)

    actions.put(action)
    persistPendingActions(actions)

    // Trigger immediate background sweep for ACTIONS
    try {
        val workManager = WorkManager.getInstance(context)
        val fastSweep = OneTimeWorkRequestBuilder<PrintQueueWorker>() 
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()
        workManager.enqueueUniqueWork("pending-actions-fast-sweep", ExistingWorkPolicy.REPLACE, fastSweep)
    } catch (e: Exception) {
        Log.w("NativeConfigStore", "Failed to trigger pending-actions worker: ${e.message}")
    }

    return action
  }

  fun getTelegramSettings(): JSONObject {
    val settings = readSettings()
    for (i in 0 until settings.length()) {
      val s = settings.optJSONObject(i) ?: continue
      if (s.optString("key") == "telegram.intents") {
        return s.optJSONObject("value") ?: JSONObject()
      }
    }
    return JSONObject()
  }

  fun getTelegramToken(): String {
    val settings = readSettings()
    for (i in 0 until settings.length()) {
      val s = settings.optJSONObject(i) ?: continue
      if (s.optString("key") == "telegram.token") {
        return s.optString("value", "")
      }
    }
    return ""
  }

  fun processPendingActions(context: String = "manual", maxAttemptsPerRun: Int = 20): JSONObject {
    val now = System.currentTimeMillis()
    val actions = readPendingActions()
    val updatedActions = JSONArray()

    var processed = 0
    var succeeded = 0
    var retried = 0
    var deadLettered = 0

    for (index in 0 until actions.length()) {
      val action = actions.optJSONObject(index) ?: continue
      val status = action.optString("status")
      val nextAttemptAt = action.optLong("next_attempt_at", 0L)
      val eligible = status == ACTION_STATUS_PENDING || status == ACTION_STATUS_RETRYING

      if (!eligible || processed >= maxAttemptsPerRun || nextAttemptAt > now) {
        updatedActions.put(action)
        continue
      }

      val processingAction = JSONObject(action.toString())
        .put("status", ACTION_STATUS_PROCESSING)
        .put("updated_at", now)

      try {
        val type = processingAction.optString("type")
        val payload = processingAction.optJSONObject("payload") ?: JSONObject()

        when (type) {
          ACTION_TYPE_CLOUD_SYNC -> {
            Log.d("PendingAction", "Processing Cloud Sync action: $payload")
          }
          ACTION_TYPE_ORDER_REPORT -> {
            val orderId = payload.optString("order_id")
            val order = findOrderById(readOrders(), orderId)
            if (order != null) {
              val token = getTelegramToken()
              val settings = getTelegramSettings()
              val intents = settings.optJSONArray("intents") ?: JSONArray()
              var chatId = ""
              for (i in 0 until intents.length()) {
                val intent = intents.optJSONObject(i) ?: continue
                if (intent.optString("intent") == "ORDER_TRACKER" && intent.optBoolean("enabled", false)) {
                  chatId = intent.optString("chat_id")
                  break
                }
              }
              if (token.isNotBlank() && chatId.isNotBlank()) {
                val store = readStore()
                val lang = store.optString("language", "en")
                val curr = store.optString("currency", "USD")
                val message = TelegramFormatter.formatOrderMessage(order, status == ACTION_STATUS_RETRYING, lang, curr)
                TelegramReporter.sendMessage(token, chatId, message)
              }
            }
          }
          ACTION_TYPE_SHIFT_REPORT -> {
            val action = payload.optString("action")
            if (action == "close") {
              val shiftId = payload.optString("shift_id")
              val shift = findShiftById(readShifts(), shiftId)
              if (shift != null) {
                val enrichedShift: JSONObject = JSONObject(shift.toString()).put("summary", computeShiftSummary(shiftId))
                val token = getTelegramToken()
                val settings = getTelegramSettings()
                val intents = settings.optJSONArray("intents") ?: JSONArray()
                var chatId = ""
                for (i in 0 until intents.length()) {
                  val intent = intents.optJSONObject(i) ?: continue
                  if (intent.optString("intent") == "SHIFT_TRACKER" && intent.optBoolean("enabled", false)) {
                    chatId = intent.optString("chat_id")
                    break
                  }
                }
                if (token.isNotBlank() && chatId.isNotBlank()) {
                  val store = readStore()
                  val lang = store.optString("language", "en")
                  val curr = store.optString("currency", "USD")
                  val message = TelegramFormatter.formatShiftCloseMessage(enrichedShift, status == ACTION_STATUS_RETRYING, lang, curr)
                  TelegramReporter.sendMessage(token, chatId, message)
                }
              }
            }
          }
          ACTION_TYPE_DAY_CLOSE_REPORT -> {
            val date = payload.optString("date", LocalDate.now().toString())
            val daySummary = computeDaySummary(date)
            val token = getTelegramToken()
            val settings = getTelegramSettings()
            val intents = settings.optJSONArray("intents") ?: JSONArray()
            var chatId = ""
            for (i in 0 until intents.length()) {
              val intent = intents.optJSONObject(i) ?: continue
              if (intent.optString("intent") == "SHIFT_TRACKER" && intent.optBoolean("enabled", false)) {
                chatId = intent.optString("chat_id")
                break
              }
            }
            if (token.isNotBlank() && chatId.isNotBlank()) {
              val store = readStore()
              val lang = store.optString("language", "en")
              val curr = store.optString("currency", "USD")
              val message = TelegramFormatter.formatDayCloseMessage(daySummary, lang, curr)
              TelegramReporter.sendMessage(token, chatId, message)
            }
          }
          else -> {
            Log.w("PendingAction", "Unknown action type: $type")
          }
        }

        val successAction = JSONObject(processingAction.toString())
          .put("status", ACTION_STATUS_SUCCEEDED)
          .put("last_error", JSONObject.NULL)
          .put("updated_at", now)
        updatedActions.put(successAction)
        succeeded += 1
      } catch (error: Exception) {
        val attempts = processingAction.optInt("attempt_count", 0) + 1
        val maxAttempts = processingAction.optInt("max_attempts", DEFAULT_MAX_PRINT_ATTEMPTS)
        val message = error.message ?: "Action failed"

        if (attempts >= maxAttempts) {
          val dead = JSONObject(processingAction.toString())
            .put("status", ACTION_STATUS_DEAD_LETTER)
            .put("attempt_count", attempts)
            .put("last_error", message)
            .put("updated_at", now)
          updatedActions.put(dead)
          deadLettered += 1
        } else {
          val backoffMs = computeBackoffMs(attempts)
          val retry = JSONObject(processingAction.toString())
            .put("status", ACTION_STATUS_RETRYING)
            .put("attempt_count", attempts)
            .put("next_attempt_at", now + backoffMs)
            .put("last_error", message)
            .put("updated_at", now)
          updatedActions.put(retry)
          retried += 1
        }
      }
      processed += 1
    }

    persistPendingActions(updatedActions)

    return JSONObject()
      .put("context", context)
      .put("processed", processed)
      .put("succeeded", succeeded)
      .put("retried", retried)
      .put("dead_lettered", deadLettered)
  }

  fun getPendingActionsStatus(): JSONObject {
    val actions = readPendingActions()
    var pending = 0
    var retrying = 0
    var processing = 0
    var succeeded = 0
    var deadLetter = 0
    var nextAttemptAt: Long? = null

    for (index in 0 until actions.length()) {
      val action = actions.optJSONObject(index) ?: continue
      when (action.optString("status")) {
        ACTION_STATUS_PENDING -> pending += 1
        ACTION_STATUS_RETRYING -> {
          retrying += 1
          val candidate = action.optLong("next_attempt_at", 0L)
          if (candidate > 0 && (nextAttemptAt == null || candidate < nextAttemptAt)) {
            nextAttemptAt = candidate
          }
        }
        ACTION_STATUS_PROCESSING -> processing += 1
        ACTION_STATUS_SUCCEEDED -> succeeded += 1
        ACTION_STATUS_DEAD_LETTER -> deadLetter += 1
      }
    }

    return JSONObject()
      .put("total_actions", actions.length())
      .put("pending_actions", pending)
      .put("retrying_actions", retrying)
      .put("processing_actions", processing)
      .put("succeeded_actions", succeeded)
      .put("dead_letter_actions", deadLetter)
      .put("next_attempt_at", nextAttemptAt ?: JSONObject.NULL)
  }

  fun getDeadLetterDetails(): JSONObject {
    val printQueue = readPrintQueue()
    val pendingActions = readPendingActions()
    
    val printDeadLetters = JSONArray()
    for (i in 0 until printQueue.length()) {
      val job = printQueue.optJSONObject(i) ?: continue
      if (job.optString("status") == PRINT_JOB_DEAD_LETTER) {
        printDeadLetters.put(job)
      }
    }

    val genericDeadLetters = JSONArray()
    for (i in 0 until pendingActions.length()) {
      val action = pendingActions.optJSONObject(i) ?: continue
      if (action.optString("status") == ACTION_STATUS_DEAD_LETTER) {
        genericDeadLetters.put(action)
      }
    }

    return JSONObject()
      .put("print_jobs", printDeadLetters)
      .put("generic_actions", genericDeadLetters)
  }

  fun purgeDeadLetters(): JSONObject {
    val printQueue = readPrintQueue()
    val updatedPrint = JSONArray()
    var printPurged = 0
    for (i in 0 until printQueue.length()) {
      val job = printQueue.optJSONObject(i) ?: continue
      if (job.optString("status") != PRINT_JOB_DEAD_LETTER) {
        updatedPrint.put(job)
      } else {
        printPurged++
      }
    }
    persistPrintQueue(updatedPrint)

    val actions = readPendingActions()
    val updatedActions = JSONArray()
    var actionsPurged = 0
    for (i in 0 until actions.length()) {
      val action = actions.optJSONObject(i) ?: continue
      if (action.optString("status") != ACTION_STATUS_DEAD_LETTER) {
        updatedActions.put(action)
      } else {
        actionsPurged++
      }
    }
    persistPendingActions(updatedActions)

    return JSONObject()
      .put("print_purged", printPurged)
      .put("actions_purged", actionsPurged)
  }

  fun forceRetryAction(actionId: String): JSONObject {
    val actions = readPendingActions()
    var found = false
    val now = System.currentTimeMillis()

    for (i in 0 until actions.length()) {
      val action = actions.optJSONObject(i) ?: continue
      if (action.optString("id") == actionId) {
        action.put("status", ACTION_STATUS_PENDING)
          .put("attempt_count", 0)
          .put("next_attempt_at", now)
          .put("updated_at", now)
        found = true
        break
      }
    }

    if (found) {
      persistPendingActions(actions)
      processPendingActions("manual-force", 10)
    }

    return JSONObject().put("success", found)
  }

  private fun buildDefaultStore(): JSONObject {
    return JSONObject()
      .put("id", "android-shell-store")
      .put("name", "")
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
        value = false,
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
          .put("connection_method", "lan")
          .put("protocol", "raw9100")
          .put("host", "")
          .put("port", 9100)
          .put("timeout_ms", 5000)
          .put("profile", "default"),
        valueType = "json",
        category = "Printing",
        description = "Network printer configuration supporting LAN or WiFi over RAW TCP printing transport."
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
          .put("mini_batch_size", 20)
          .put("store_id", JSONObject.NULL)
          .put("store_linked_at", JSONObject.NULL)
          .put("store_client_name", JSONObject.NULL)
          .put("store_last_seen_at", JSONObject.NULL),
        valueType = "json",
        category = "Cloud Sync",
        description = "Cloud ingestion configuration (toggle, key, base URL)."
      ))
      .put(buildSettingRecord(
        id = "android-telegram-token",
        key = "telegram.token",
        value = "",
        valueType = "string",
        category = "Integrations",
        description = "Telegram Bot API Token"
      ))
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
}
