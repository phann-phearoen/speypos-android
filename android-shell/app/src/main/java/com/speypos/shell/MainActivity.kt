package com.speypos.shell

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewAssetLoader
import kotlinx.coroutines.launch
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.speypos.shell.databinding.ActivityMainBinding
import java.io.ByteArrayInputStream
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

  private lateinit var binding: ActivityMainBinding
  private val mainHandler = Handler(Looper.getMainLooper())
  private var loadTimeoutRunnable: Runnable? = null
  private val runtimeState = NativeRuntimeState()
  private val configStore by lazy { NativeConfigStore(applicationContext) }
  private val updateManager by lazy { UpdateManager(applicationContext, configStore) }
  private val vibrationManager by lazy { VibrationManager(applicationContext) }
  private val soundManager by lazy { SoundManager(applicationContext) }
  private val nativeBridge by lazy { SpeyposNativeBridge(configStore, runtimeState, updateManager, vibrationManager, soundManager, lifecycleScope) }
  
  private var filePathCallback: android.webkit.ValueCallback<Array<Uri>>? = null
  private val fileChooserLauncher = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { result ->
    if (result.resultCode == android.app.Activity.RESULT_OK) {
      val data = result.data?.data
      val clipData = result.data?.clipData
      
      val results = when {
        data != null -> arrayOf(data)
        clipData != null -> Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
        else -> null
      }
      filePathCallback?.onReceiveValue(results)
    } else {
      filePathCallback?.onReceiveValue(null)
    }
    filePathCallback = null
  }

  private val assetLoader by lazy {
    WebViewAssetLoader.Builder()
      .setDomain(VIRTUAL_DOMAIN)
      .addPathHandler("/web/", AssetsPathHandler(applicationContext))
      .build()
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Initialize Crash Handler
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler(SpeyposCrashHandler(applicationContext, configStore, defaultHandler))
    
    DiagnosticsManager.addBreadcrumb("App Created")
    
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    
    Log.d("SpeyposAssets", "Checking index.html access...")
    try {
      val stream = applicationContext.assets.open("web/index.html")
      Log.d("SpeyposAssets", "index.html opened successfully. Size: ${stream.available()}")
      stream.close()
    } catch (e: Exception) {
      Log.e("SpeyposAssets", "CRITICAL: Could not open index.html from assets!", e)
    }

    configStore.seedIfNeeded()
    schedulePrintQueueWorkers()
    scheduleCloudSyncWorkers()
    
    // Check for updates on startup (Disabled temporarily for debugging shell load)
    // lifecycleScope.launch {
    //   updateManager.checkForUpdates()
    // }

    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    configureWebView(binding.webView)
    binding.retryButton.setOnClickListener {
      showWebView()
      loadFrontend()
    }

    observeRuntimeActions()
    loadFrontend()
  }

  private fun observeRuntimeActions() {
    lifecycleScope.launchWhenStarted {
      runtimeState.actions.collect { action ->
        Log.d("SpeyposLifecycle", "Received shell action: $action")
        when (action) {
          ShellAction.RELOAD_FRONTEND -> {
            mainHandler.post { loadFrontend() }
          }
          ShellAction.RECREATE_ACTIVITY -> {
            mainHandler.post { recreate() }
          }
        }
      }
    }
  }

  override fun onPause() {
    DiagnosticsManager.addBreadcrumb("App Paused")
    binding.webView.onPause()
    super.onPause()
  }

  override fun onResume() {
    super.onResume()
    DiagnosticsManager.addBreadcrumb("App Resumed")
    binding.webView.onResume()
  }

  override fun onDestroy() {
    DiagnosticsManager.addBreadcrumb("App Destroyed")
    loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
    soundManager.release()
    binding.webView.destroy()
    super.onDestroy()
  }

  private fun configureWebView(webView: WebView) {
    webView.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      databaseEnabled = true
      allowFileAccess = true
      allowContentAccess = true
      javaScriptCanOpenWindowsAutomatically = false
      mediaPlaybackRequiresUserGesture = false
      cacheMode = WebSettings.LOAD_DEFAULT
      mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
      setSupportMultipleWindows(false)
      allowFileAccessFromFileURLs = true
      allowUniversalAccessFromFileURLs = true
      loadWithOverviewMode = true
      useWideViewPort = true
    }

    webView.webChromeClient = object : android.webkit.WebChromeClient() {
      override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
        val message = consoleMessage?.message() ?: ""
        val level = consoleMessage?.messageLevel()
        val source = consoleMessage?.sourceId() ?: "unknown"
        val line = consoleMessage?.lineNumber() ?: 0

        val formatted = "[JS] [$level] $message ($source:$line)"
        when (level) {
          android.webkit.ConsoleMessage.MessageLevel.ERROR -> Log.e("SpeyposJS", formatted)
          android.webkit.ConsoleMessage.MessageLevel.WARNING -> Log.w("SpeyposJS", formatted)
          else -> Log.d("SpeyposJS", formatted)
        }
        
        DiagnosticsManager.addBreadcrumb("JS $level: $message")
        return true
      }

      override fun onShowFileChooser(
        webView: WebView?,
        callback: android.webkit.ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
      ): Boolean {
        Log.i("SpeyposChrome", "onShowFileChooser triggered")
        filePathCallback?.onReceiveValue(null)
        filePathCallback = callback

        val intent = fileChooserParams?.createIntent() ?: android.content.Intent(android.content.Intent.ACTION_GET_CONTENT).apply {
          addCategory(android.content.Intent.CATEGORY_OPENABLE)
          type = "*/*"
        }

        return try {
          fileChooserLauncher.launch(intent)
          true
        } catch (e: Exception) {
          Log.e("SpeyposChrome", "Failed to launch file chooser", e)
          filePathCallback = null
          false
        }
      }
    }

    webView.isLongClickable = false
    webView.setOnLongClickListener { true }
    webView.addJavascriptInterface(nativeBridge, "SpeyposNativeBridge")
    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        return false
      }

      override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
      ): WebResourceResponse? {
        val url = request?.url ?: return null
        
        Log.d("SpeyposIntercept", "Request: ${url}")

        // 1. Handle media files from internal storage
        if (url.host == VIRTUAL_DOMAIN && url.path?.startsWith("/media/") == true) {
          val path = url.path!!
          Log.d("SpeyposIntercept", "Intercepting Media: $path")
          val parts = path.split("/")
          if (parts.size >= 4) {
            val type = parts[2]
            val filename = parts[3]
            val file = java.io.File(applicationContext.filesDir, "media/$type/$filename")
            
            if (file.exists()) {
              val mimeType = when {
                filename.lowercase().endsWith(".jpg") || filename.lowercase().endsWith(".jpeg") -> "image/jpeg"
                filename.lowercase().endsWith(".png") -> "image/png"
                filename.lowercase().endsWith(".webp") -> "image/webp"
                filename.lowercase().endsWith(".gif") -> "image/gif"
                else -> "application/octet-stream"
              }
              
              Log.d("SpeyposIntercept", "Serving local media: ${file.absolutePath} (MIME: $mimeType)")
              val response = WebResourceResponse(mimeType, null, file.inputStream())
              response.responseHeaders = mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to "max-age=3600"
              )
              return response
            } else {
              Log.w("SpeyposIntercept", "Media file not found: ${file.absolutePath}")
            }
          }
        }

        // 2. Handle native API calls on the same virtual domain first to avoid asset loader collisions
        if (url.host == VIRTUAL_DOMAIN && url.path?.startsWith("/api/") == true) {
          Log.d("SpeyposIntercept", "Intercepting API: ${url.path}")
          val apiResponse = handleNativeApiRequest(request)
          if (apiResponse != null) return apiResponse
        }

        // 2. Map virtual domain to assets
        if (url.host == VIRTUAL_DOMAIN) {
          val path = url.path ?: ""
          val assetPath = if (path.startsWith("/web/")) {
            path.substring(1) // Keep the 'web/' part
          } else {
            "web" + path
          }
          
          Log.d("SpeyposIntercept", "Mapping $path -> $assetPath")
          
          try {
            val mimeType = when {
              path.endsWith(".html") -> "text/html"
              path.endsWith(".js") -> "application/javascript"
              path.endsWith(".css") -> "text/css"
              path.endsWith(".svg") -> "image/svg+xml"
              path.endsWith(".png") -> "image/png"
              path.endsWith(".ttf") -> "font/ttf"
              path.endsWith(".woff") -> "font/woff"
              path.endsWith(".woff2") -> "font/woff2"
              else -> "application/octet-stream"
            }
            
            val stream = applicationContext.assets.open(assetPath)
            val response = WebResourceResponse(mimeType, "UTF-8", stream)
            
            // Critical for ESM modules and mixed content: allow all
            response.responseHeaders = mapOf(
              "Access-Control-Allow-Origin" to "*",
              "Access-Control-Allow-Methods" to "GET, OPTIONS",
              "Access-Control-Allow-Headers" to "Content-Type",
              "Cache-Control" to "no-cache, no-store, must-revalidate"
            )
            
            return response
          } catch (e: Exception) {
            Log.e("SpeyposIntercept", "Failed to open asset: $assetPath", e)
          }
        }

        return super.shouldInterceptRequest(view, request)
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        DiagnosticsManager.addBreadcrumb("Page Finished: $url")
        runtimeState.startupPhase = "ready"
        loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
        showWebView()
      }

      override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
      ) {
        val description = error?.description ?: "Unknown Error"
        val errorCode = error?.errorCode ?: 0
        val url = request?.url?.toString() ?: "unknown"
        Log.e("SpeyposWebView", "WebView Error: $description (code: $errorCode) for $url")
        DiagnosticsManager.addBreadcrumb("Page Error: $description ($errorCode) for $url")
        
        if (request?.isForMainFrame == true) {
          runtimeState.startupPhase = "frontend_error"
          showError("Unable to load the POS shell: $description")
        }
      }
    }
  }

  private fun handleNativeApiRequest(request: WebResourceRequest): WebResourceResponse? {
    val start = System.currentTimeMillis()
    val path = request.url.path ?: return null
    
    Log.d("SpeyposAPI", "Incoming API Request: ${request.method} $path")
    
    if (request.method == "OPTIONS") {
      return WebResourceResponse(
        "text/plain",
        "UTF-8",
        204,
        "No Content",
        mapOf(
          "Access-Control-Allow-Origin" to "*",
          "Access-Control-Allow-Methods" to "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers" to "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age" to "3600"
        ),
        ByteArrayInputStream(ByteArray(0))
      )
    }

    val jsonResponse = when {
      path == "/api/setup/status" || path == "/api/system/setup-status" -> nativeBridge.getSetupStatus()
      path == "/api/auth/login" -> "{}" // Handled via Bridge directly by PWA, this is just to prevent 404/Timeout
      path == "/api/store" -> nativeBridge.getStore()
      path.startsWith("/api/store") || path.startsWith("/api/settings") -> "{\"data\":{}}"
      path == "/api/settings" || path == "/api/all-settings" -> nativeBridge.getAllSettings()
      path == "/api/cloud-sync-settings" -> nativeBridge.getCloudSyncSettings()
      path == "/api/staff" -> nativeBridge.getStaff()
      path == "/api/shifts" -> nativeBridge.getShifts()
      path == "/api/orders" -> {
        val limit = request.url.getQueryParameter("limit")?.toIntOrNull() ?: -1
        nativeBridge.getOrders(limit)
      }
      path == "/api/menu-categories" -> nativeBridge.getMenuCategories()
      path == "/api/menu-items" -> nativeBridge.getMenuItems()
      path.startsWith("/api/menu-item") || path.startsWith("/api/menu-category") || path.startsWith("/api/staff/") -> "{\"data\":{}}"
      path.startsWith("/api/menu-item-category-map") -> "{\"data\":{}}"
      path.startsWith("/api/customization-option") || path.startsWith("/api/topping-option") -> "{\"data\":{}}"
      path.startsWith("/api/menu-item-customization-group") || path.startsWith("/api/menu-item-topping-group") -> "{\"data\":{}}"
      path == "/api/customization-groups" -> nativeBridge.getCustomizationGroups()
      path == "/api/customization-options" -> nativeBridge.getCustomizationOptions()
      path == "/api/topping-groups" -> nativeBridge.getToppingGroups()
      path == "/api/topping-options" -> nativeBridge.getToppingOptions()
      path == "/api/menu-item-customization-mappings" -> nativeBridge.getMenuItemCustomizationMappings()
      path == "/api/menu-category-customization-mappings" -> nativeBridge.getMenuCategoryCustomizationMappings()
      path == "/api/menu-item-topping-mappings" -> nativeBridge.getMenuItemToppingMappings()
      path == "/api/menu-category-topping-mappings" -> nativeBridge.getMenuCategoryToppingMappings()
      path == "/api/print-queue/status" -> nativeBridge.getPrintQueueStatus()
      path == "/api/runtime/status" -> nativeBridge.getRuntimeStatus()
      path == "/api/runtime/pending-actions" -> nativeBridge.getPendingActions()
      path == "/api/system/export" -> {
        val mode = request.url.getQueryParameter("mode") ?: "full"
        nativeBridge.exportData(mode)
      }
      path == "/api/system/import" -> {
        // This endpoint would normally need the POST body, but since we are intercepting 
        // in a simplified way, we only support GET for these diagnostic triggers if needed,
        // or we'd need to extract body from request (which is complex in shouldInterceptRequest).
        // For now, we'll just acknowledge the path exists if anyone wants to test routing.
        "{\"data\":{\"supported\":false,\"message\":\"Use Native Bridge for Import\"}}"
      }
      path == "/api/display/session" -> {
        "{\"data\":null}" 
      }
      path == "/api/print-queue/retry" -> nativeBridge.triggerPrintQueueRetry()
      path == "/api/pending-actions/retry" -> nativeBridge.triggerPendingActionsRetry()
      else -> null
    }

    val response = if (jsonResponse != null) {
      WebResourceResponse(
        "application/json",
        "UTF-8",
        200,
        "OK",
        mapOf(
          "Access-Control-Allow-Origin" to "*",
          "Access-Control-Allow-Methods" to "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers" to "Content-Type, Authorization, X-Requested-With"
        ),
        ByteArrayInputStream(jsonResponse.toByteArray())
      )
    } else {
      null
    }
    
    val totalTime = System.currentTimeMillis() - start
    if (totalTime > 100) {
        Log.w("SpeyposPerf", "SLOW API Request [${request.method} $path]: ${totalTime}ms")
    }
    return response
  }

  private fun loadFrontend() {
    DiagnosticsManager.addBreadcrumb("Loading Frontend")
    runtimeState.startupPhase = "loading_frontend"
    val frontendUrl = buildFrontendUrl()
    Log.i("SpeyposWebView", "Loading URL: $frontendUrl")
    binding.webView.loadUrl(frontendUrl)

    loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
    loadTimeoutRunnable = Runnable {
      if (runtimeState.startupPhase == "loading_frontend") {
        runtimeState.startupPhase = "frontend_timeout"
        showError("The POS shell did not finish loading. Try restarting the app.")
      }
    }
    mainHandler.postDelayed(loadTimeoutRunnable!!, 20_000)
  }

  private fun buildFrontendUrl(): String {
    val apiProvider = "native"
    val apiBaseUrl = "https://$VIRTUAL_DOMAIN/api"

    val backendUrl = Uri.encode("https://$VIRTUAL_DOMAIN")
    val encodedApiBaseUrl = Uri.encode(apiBaseUrl)
    
    // We append #/pos/shift (or just #/) to bypass any early redirect issues
    // while keeping the native query params
    return "https://$VIRTUAL_DOMAIN/web/index.html?backendUrl=$backendUrl&apiBaseUrl=$encodedApiBaseUrl&apiProvider=$apiProvider&disableServiceWorker=true#/"
  }

  private fun schedulePrintQueueWorkers() {
    val workManager = WorkManager.getInstance(applicationContext)
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val periodic = PeriodicWorkRequestBuilder<PrintQueueWorker>(15, TimeUnit.MINUTES)
      .setConstraints(constraints)
      .build()

    workManager.enqueueUniquePeriodicWork(
      PRINT_QUEUE_PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.UPDATE,
      periodic
    )

    val startupSweep = OneTimeWorkRequestBuilder<PrintQueueWorker>()
      .setInitialDelay(2, TimeUnit.SECONDS)
      .setConstraints(constraints)
      .build()

    workManager.enqueueUniqueWork(
      PRINT_QUEUE_STARTUP_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      startupSweep
    )
  }

  private fun scheduleCloudSyncWorkers() {
    val workManager = WorkManager.getInstance(applicationContext)
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val periodic = PeriodicWorkRequestBuilder<CloudSyncWorker>(15, TimeUnit.MINUTES)
      .setConstraints(constraints)
      .build()

    workManager.enqueueUniquePeriodicWork(
      CLOUD_SYNC_PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.UPDATE,
      periodic
    )

    val startupSweep = OneTimeWorkRequestBuilder<CloudSyncWorker>()
      .setInitialDelay(5, TimeUnit.SECONDS)
      .setConstraints(constraints)
      .build()

    workManager.enqueueUniqueWork(
      CLOUD_SYNC_STARTUP_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      startupSweep
    )
  }

  private fun showError(message: String) {
    binding.errorMessage.text = message
    binding.webView.visibility = View.GONE
    binding.errorContainer.visibility = View.VISIBLE
  }

  private fun showWebView() {
    binding.webView.visibility = View.VISIBLE
    binding.errorContainer.visibility = View.GONE
  }

  companion object {
    private const val VIRTUAL_DOMAIN = "app.speypos.local"
    private const val PRINT_QUEUE_PERIODIC_WORK_NAME = "speypos-print-queue-periodic"
    private const val PRINT_QUEUE_STARTUP_WORK_NAME = "speypos-print-queue-startup"
    private const val CLOUD_SYNC_PERIODIC_WORK_NAME = "speypos-cloud-sync-periodic"
    private const val CLOUD_SYNC_STARTUP_WORK_NAME = "speypos-cloud-sync-startup"
  }
}