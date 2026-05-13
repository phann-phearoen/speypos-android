package com.speypos.shell

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class PrintQueueWorker(
  appContext: Context,
  workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {

  override suspend fun doWork(): Result {
    val store = NativeConfigStore(applicationContext)
    store.seedIfNeeded()

    return try {
      store.processPrintQueue(context = "worker", maxAttemptsPerRun = 50)
      val summary = store.getPrintQueueStatus()
      val pending = summary.optInt("pending_jobs", 0) + summary.optInt("retrying_jobs", 0)

      if (pending > 0) {
        Result.retry()
      } else {
        Result.success()
      }
    } catch (_: Exception) {
      Result.retry()
    }
  }
}
