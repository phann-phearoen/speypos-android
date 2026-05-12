package com.speypos.shell

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceError
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.speypos.shell.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

  private lateinit var binding: ActivityMainBinding
  private val mainHandler = Handler(Looper.getMainLooper())
  private var loadTimeoutRunnable: Runnable? = null

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)

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
      javaScriptCanOpenWindowsAutomatically = false
      mediaPlaybackRequiresUserGesture = false
      cacheMode = WebSettings.LOAD_DEFAULT
      mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
    }

    webView.isLongClickable = false
    webView.setOnLongClickListener { true }
    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        return false
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
        showWebView()
      }

      override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
      ) {
        if (request?.isForMainFrame == true) {
          showError("Unable to load the POS shell. Check the packaged frontend assets and try again.")
        }
      }
    }
  }

  private fun loadFrontend() {
    val frontendUrl = buildFrontendUrl()
    binding.webView.loadUrl(frontendUrl)

    loadTimeoutRunnable?.let(mainHandler::removeCallbacks)
    loadTimeoutRunnable = Runnable {
      showError("The POS shell did not finish loading. Restart the app or rebuild the packaged assets.")
    }
    mainHandler.postDelayed(loadTimeoutRunnable!!, 15_000)
  }

  private fun buildFrontendUrl(): String {
    val backendUrl = Uri.encode("http://127.0.0.1:8080")
    val apiBaseUrl = Uri.encode("http://127.0.0.1:8080/api")
    return "file:///android_asset/web/index.html?backendUrl=$backendUrl&apiBaseUrl=$apiBaseUrl&disableServiceWorker=true"
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
}