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
  private val nativeBridge by lazy { SpeyposNativeBridge(configStore, runtimeState) }

  private val assetLoader by lazy {
    WebViewAssetLoader.Builder()
      .setDomain(VIRTUAL_DOMAIN)
      .addPathHandler("/web/", AssetsPathHandler(this))
      .build()
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    
    configStore.seedIfNeeded()
    schedulePrintQueueWorkers()
    scheduleCloudSyncWorkers()

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
    binding.webView.onPause()
    super.onPause()
  }

  override fun onResume() {
    super.onResume()
    binding.webView.onResume()
  }

  override fun onDestroy() {
    loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
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
        
        // 1. Handle native API calls on the same virtual domain first to avoid asset loader collisions
        if (url.host == VIRTUAL_DOMAIN && url.path?.startsWith("/api/") == true) {
          Log.d("SpeyposIntercept", "Intercepting API: ${url.path}")
          val apiResponse = handleNativeApiRequest(request)
          if (apiResponse != null) return apiResponse
        }

        // 2. Try to load from assets via AssetLoader
        val assetResponse = assetLoader.shouldInterceptRequest(url)
        if (assetResponse != null) return assetResponse

        return super.shouldInterceptRequest(view, request)
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        runtimeState.startupPhase = "ready"
        loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
        showWebView()
      }

      override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
      ) {
        if (request?.isForMainFrame == true) {
          runtimeState.startupPhase = "frontend_error"
          showError("Unable to load the POS shell. Check the packaged frontend assets and try again.")
        }
      }
    }
  }

  private fun handleNativeApiRequest(request: WebResourceRequest): WebResourceResponse? {
    val path = request.url.path ?: return null
    
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
      path == "/api/orders" -> nativeBridge.getOrders()
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
      path == "/api/print-queue/retry" -> nativeBridge.triggerPrintQueueRetry()
      path == "/api/pending-actions/retry" -> nativeBridge.triggerPendingActionsRetry()
      else -> null
    }

    return if (jsonResponse != null) {
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
  }

  private fun loadFrontend() {
    runtimeState.startupPhase = "loading_frontend"
    val frontendUrl = buildFrontendUrl()
    binding.webView.loadUrl(frontendUrl)

    loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
    loadTimeoutRunnable = Runnable {
      runtimeState.startupPhase = "frontend_timeout"
      showError("The POS shell did not finish loading. Restart the app or rebuild the packaged assets.")
    }
    mainHandler.postDelayed(loadTimeoutRunnable!!, 15_000)
  }

  private fun buildFrontendUrl(): String {
    val apiProvider = "native"
    val apiBaseUrl = "https://$VIRTUAL_DOMAIN/api"

    val backendUrl = Uri.encode("https://$VIRTUAL_DOMAIN")
    val encodedApiBaseUrl = Uri.encode(apiBaseUrl)
    return "https://$VIRTUAL_DOMAIN/web/index.html?backendUrl=$backendUrl&apiBaseUrl=$encodedApiBaseUrl&apiProvider=$apiProvider&disableServiceWorker=true"
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