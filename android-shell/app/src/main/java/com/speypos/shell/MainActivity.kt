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

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    configStore.seedIfNeeded()
    schedulePrintQueueWorkers()

    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    configureWebView(binding.webView)
    binding.retryButton.setOnClickListener {
      showWebView()
      loadFrontend()
    }

    loadFrontend()
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
      allowFileAccessFromFileURLs = true
      allowUniversalAccessFromFileURLs = true
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
        Log.d("SpeyposIntercept", "Request: ${url.host}:${url.port}${url.path}")
        if (url.host == "127.0.0.1" && url.port == 8080) {
          Log.d("SpeyposIntercept", "Intercepting: ${url.path}")
          return handleNativeApiRequest(request)
        }
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
    if (!path.startsWith("/api/")) return null

    val jsonResponse = when {
      path == "/api/setup/status" || path == "/api/system/setup-status" -> nativeBridge.getSetupStatus()
      path == "/api/store" -> nativeBridge.getStore()
      path == "/api/settings" || path == "/api/all-settings" -> nativeBridge.getAllSettings()
      path == "/api/staff" -> nativeBridge.getStaff()
      path == "/api/shifts" -> nativeBridge.getShifts()
      path == "/api/orders" -> nativeBridge.getOrders()
      path == "/api/menu-categories" -> nativeBridge.getMenuCategories()
      path == "/api/menu-items" -> nativeBridge.getMenuItems()
      path == "/api/customization-groups" -> nativeBridge.getCustomizationGroups()
      path == "/api/customization-options" -> nativeBridge.getCustomizationOptions()
      path == "/api/topping-groups" -> nativeBridge.getToppingGroups()
      path == "/api/topping-options" -> nativeBridge.getToppingOptions()
      path == "/api/menu-item-customization-mappings" -> nativeBridge.getMenuItemCustomizationMappings()
      path == "/api/menu-category-customization-mappings" -> nativeBridge.getMenuCategoryCustomizationMappings()
      path == "/api/menu-item-topping-mappings" -> nativeBridge.getMenuItemToppingMappings()
      path == "/api/menu-category-topping-mappings" -> nativeBridge.getMenuCategoryToppingMappings()
      else -> null
    }

    if (jsonResponse == null) {
      Log.w("SpeyposIntercept", "Unhandled API path: $path")
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
          "Access-Control-Allow-Headers" to "Content-Type, Authorization"
        ),
        ByteArrayInputStream(jsonResponse.toByteArray())
      )
    } else if (request.method == "OPTIONS") {
      WebResourceResponse(
        "text/plain",
        "UTF-8",
        204,
        "No Content",
        mapOf(
          "Access-Control-Allow-Origin" to "*",
          "Access-Control-Allow-Methods" to "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers" to "Content-Type, Authorization"
        ),
        ByteArrayInputStream(ByteArray(0))
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
    val backendUrl = Uri.encode("http://127.0.0.1:8080")
    val apiBaseUrl = Uri.encode("http://127.0.0.1:8080/api")
    return "file:///android_asset/web/index.html?backendUrl=$backendUrl&apiBaseUrl=$apiBaseUrl&apiProvider=native&disableServiceWorker=true"
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
    private const val PRINT_QUEUE_PERIODIC_WORK_NAME = "speypos-print-queue-periodic"
    private const val PRINT_QUEUE_STARTUP_WORK_NAME = "speypos-print-queue-startup"
  }
}