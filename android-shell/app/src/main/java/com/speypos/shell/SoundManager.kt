package com.speypos.shell

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.util.Log

class SoundManager(context: Context) {
    private val toneGenerator = ToneGenerator(AudioManager.STREAM_SYSTEM, 80)
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    fun playSound(type: String) {
        Log.d("SoundManager", "Play Sound: $type")
        when (type.lowercase()) {
            "click" -> {
                // High-pitched short digital click (Confirmed working)
                toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 50)
            }
            "tick" -> {
                // Neutral mid-range tick for quantity (Using BEEP2 for robustness)
                toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2, 50)
            }
            "success" -> {
                // Distinct Bell Ding / Success Chime
                // TONE_CDMA_CONFIRM is a triple-beep harmonic chime
                toneGenerator.startTone(ToneGenerator.TONE_CDMA_CONFIRM, 400)
            }
            "warning" -> {
                // NACK beep for deletions
                toneGenerator.startTone(ToneGenerator.TONE_PROP_NACK, 200)
            }
            "error" -> {
                // System error buzz
                toneGenerator.startTone(ToneGenerator.TONE_SUP_ERROR, 200)
            }
            else -> {
                // Default system click fallback
                audioManager.playSoundEffect(AudioManager.FX_KEY_CLICK)
            }
        }
    }

    fun release() {
        toneGenerator.release()
    }
}
