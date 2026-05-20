package com.speypos.shell

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

class VibrationManager(context: Context) {
    private val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        vibratorManager.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

    fun impact(type: String) {
        when (type.lowercase()) {
            "light" -> vibrate(15, 100)
            "medium" -> vibrate(30, 180)
            "heavy" -> vibrate(50, 255)
            else -> vibrate(20, 150)
        }
    }

    fun notification(type: String) {
        when (type.lowercase()) {
            "success" -> {
                // Double pulse: light then medium
                val timings = longArrayOf(0, 15, 100, 30)
                val amplitudes = intArrayOf(0, 100, 0, 200)
                vibratePattern(timings, amplitudes)
            }
            "warning" -> {
                // Triple pulse: medium
                val timings = longArrayOf(0, 30, 80, 30, 80, 30)
                val amplitudes = intArrayOf(0, 180, 0, 180, 0, 180)
                vibratePattern(timings, amplitudes)
            }
            "error" -> {
                // Long heavy pulse
                vibrate(200, 255)
            }
        }
    }

    private fun vibrate(duration: Long, amplitude: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, amplitude))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }
    }

    private fun vibratePattern(timings: LongArray, amplitudes: IntArray) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(timings, -1)
        }
    }
}
