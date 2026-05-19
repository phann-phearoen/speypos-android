package com.speypos.shell

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class UpdateManager(private val context: Context, private val configStore: NativeConfigStore) {

    companion object {
        private const val TAG = "UpdateManager"
    }

    private var lastMetadata: JSONObject? = null
    private var isChecking: Boolean = false

    fun getLastMetadata(): JSONObject? {
        val meta = lastMetadata ?: return null
        val serverVersion = meta.optInt("versionCode", 0)
        val currentVersion = getCurrentVersionCode()
        
        return if (serverVersion > currentVersion) {
            meta
        } else {
            Log.i(TAG, "Current version ($currentVersion) is up to date with server ($serverVersion). Clearing stale metadata.")
            lastMetadata = null
            null
        }
    }

    fun getCurrentVersionCode(): Int {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current version code", e)
            0
        }
    }

    fun isChecking(): Boolean = isChecking

    suspend fun checkForUpdates(): JSONObject? {
        isChecking = true
        return withContext(Dispatchers.IO) {
            try {
                val settings = configStore.readUpdateSource()
                val baseUrl = settings.optString("base_url").trim().removeSuffix("/")
                if (baseUrl.isEmpty()) {
                    Log.i(TAG, "Update check skipped: No source URL configured")
                    return@withContext null
                }

                val secretKey = settings.optString("api_key")
                val url = URL(baseUrl)
                
                Log.d(TAG, "Checking for updates at: $baseUrl")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("X-Spey-Update-Secret", secretKey)
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)
                    
                    val serverVersion = json.optInt("versionCode", 0)
                    val currentVersion = getCurrentVersionCode()
                    
                    Log.i(TAG, "Update check result: Server=$serverVersion, Local=$currentVersion")
                    
                    if (serverVersion > currentVersion) {
                        lastMetadata = json
                        Log.i(TAG, "New version detected: ${json.optString("versionName", "unknown")}")
                    } else {
                        lastMetadata = null
                        Log.i(TAG, "App is already up to date")
                    }
                    
                    // Update last check timestamp
                    configStore.updateUpdateSource(JSONObject().put("last_check_at", System.currentTimeMillis()))

                    lastMetadata
                } else {
                    Log.w(TAG, "Update check failed with code: ${connection.responseCode}")
                    lastMetadata = null
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking for updates", e)
                lastMetadata = null
                null
            } finally {
                isChecking = false
            }
        }
    }

    suspend fun downloadAndInstall(apkUrl: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val updateDir = File(context.cacheDir, "updates")
                if (!updateDir.exists()) updateDir.mkdirs()
                
                val apkFile = File(updateDir, "speypos-update.apk")
                if (apkFile.exists()) apkFile.delete()

                Log.i(TAG, "Downloading update from: $apkUrl")
                val url = URL(apkUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 30000
                connection.readTimeout = 30000
                
                connection.inputStream.use { input ->
                    FileOutputStream(apkFile).use { output ->
                        input.copyTo(output)
                    }
                }
                
                Log.i(TAG, "Download complete: ${apkFile.absolutePath}")
                installApk(apkFile)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Error during update download/install", e)
                false
            }
        }
    }

    private fun installApk(file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.packageManager.canRequestPackageInstalls()) {
                Log.w(TAG, "Missing REQUEST_INSTALL_PACKAGES permission. Prompting user.")
                val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(settingsIntent)
                // We stop here, the user needs to grant permission and then we can try again
                // or they can click update again.
                return
            }
        }

        context.startActivity(intent)
    }
}
