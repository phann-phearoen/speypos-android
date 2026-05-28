package com.speypos.shell

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import java.time.ZonedDateTime

class NativeConfigStoreTest {

    @Mock
    private lateinit var mockContext: Context

    @Mock
    private lateinit var mockPrefs: SharedPreferences

    @Mock
    private lateinit var mockEditor: SharedPreferences.Editor

    private lateinit var configStore: NativeConfigStore

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        `when`(mockContext.getSharedPreferences(anyString(), anyInt())).thenReturn(mockPrefs)
        `when`(mockPrefs.edit()).thenReturn(mockEditor)
        `when`(mockEditor.putString(anyString(), anyString())).thenReturn(mockEditor)
        `when`(mockEditor.putBoolean(anyString(), anyBoolean())).thenReturn(mockEditor)

        configStore = NativeConfigStore(mockContext)
    }

    @Test
    fun testGetPreviousDayStatus_NoPreviousDay() {
        `when`(mockPrefs.getString(anyString(), anyString())).thenReturn("[]")
        
        val status = configStore.getPreviousDayStatus()
        
        assertFalse(status.getBoolean("hasPreviousDay"))
        assertTrue(status.getBoolean("isClosed")) // Effectively closed if none exists
        assertNotNull(status.getString("todayStoreDate"))
        assertFalse(status.getBoolean("isTodayClosed"))
    }

    @Test
    fun testOpenShift_BlockedByUnclosedPreviousDay() {
        // Setup today as 2026-05-28
        // Setup a previous shift on 2026-05-27
        val shifts = JSONArray().put(JSONObject()
            .put("id", "old-shift")
            .put("date", "2026-05-27")
            .put("status", "closed")
        )
        
        // Setup migration on 2026-05-25 (so 2026-05-27 is enforced)
        val migrations = JSONArray().put(JSONObject()
            .put("version", 1)
            .put("name", "initial")
            .put("applied_at", 1748131200000L) // 2026-05-25 00:00:00 UTC
        )

        `when`(mockPrefs.getString("native.shifts.json", "[]")).thenReturn(shifts.toString())
        `when`(mockPrefs.getString(eq("native.shifts.json"), anyString())).thenReturn(shifts.toString())
        `when`(mockPrefs.getString("native.migrations.json", "[]")).thenReturn(migrations.toString())
        `when`(mockPrefs.getString(eq("native.migrations.json"), anyString())).thenReturn(migrations.toString())
        `when`(mockPrefs.getString("native.day.closes.json", "[]")).thenReturn("[]")
        `when`(mockPrefs.getString(eq("native.day.closes.json"), anyString())).thenReturn("[]")
        `when`(mockPrefs.getString("native.store.json", "{}")).thenReturn(JSONObject().put("timezone", "UTC").toString())
        `when`(mockPrefs.getString(eq("native.store.json"), anyString())).thenReturn(JSONObject().put("timezone", "UTC").toString())

        // We need to ensure the test date is after 2026-05-27.
        // Let's print the current todayStoreDate for debugging if it fails.
        val today = configStore.getNowInStoreTime().todayStoreDate
        println("Today: $today")
        
        // Let's verify what getLastBusinessDateBefore returns
        val lastBusinessDate = configStore.javaClass.getDeclaredMethod("getLastBusinessDateBefore", String::class.java).apply {
            isAccessible = true
        }.invoke(configStore, today) as String?
        println("Last business date before $today: $lastBusinessDate")

        val enforcementDate = configStore.javaClass.getDeclaredMethod("getDayCloseEnforcementStartDate").apply {
            isAccessible = true
        }.invoke(configStore) as String
        println("Enforcement start date: $enforcementDate")

        try {
            configStore.openShift("staff-1")
            fail("Should have thrown IllegalStateException for today: $today")
        } catch (e: IllegalStateException) {
            val error = JSONObject(e.message)
            assertEquals("PREVIOUS_DAY_NOT_CLOSED", error.getString("error"))
            assertEquals("2026-05-27", error.getString("previousDate"))
        }
    }

    @Test
    fun testGetCloseDayPreview_MandatoryDate() {
        val today = "2026-05-28"
        val shifts = JSONArray().put(JSONObject()
            .put("id", "shift-1")
            .put("date", today)
            .put("status", "closed")
        )
        `when`(mockPrefs.getString(eq("native.shifts.json"), anyString())).thenReturn(shifts.toString())
        `when`(mockPrefs.getString(eq("native.orders.json"), anyString())).thenReturn("[]")
        `when`(mockPrefs.getString(eq("native.staff.json"), anyString())).thenReturn("[]")
        `when`(mockPrefs.getString(eq("native.menu.items.json"), anyString())).thenReturn("[]")

        val preview = configStore.getCloseDayPreview(today)
        assertEquals(today, preview.getString("businessDate"))
        assertEquals(1, preview.getJSONArray("shifts").length())
    }
}
