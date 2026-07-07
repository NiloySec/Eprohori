package com.eprohori.app

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShareIntentModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG   = "ShareIntentModule"
        private const val EVENT = "SharedTextReceived"

        // Pending text from cold-start or warm-start intents
        // Set by MainActivity before JS bridge is ready
        var pendingSharedText: String? = null

        fun handleIntent(intent: Intent?) {
            if (intent == null) return
            if (intent.action != Intent.ACTION_SEND) return
            if (!intent.type.orEmpty().startsWith("text/")) return
            val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim()
            if (!text.isNullOrBlank()) {
                pendingSharedText = text
            }
        }
    }

    override fun getName(): String = "ShareIntent"

    // Called by JS on app start to drain the pending shared text
    @ReactMethod
    fun getSharedText(promise: Promise) {
        val text = pendingSharedText
        pendingSharedText = null
        promise.resolve(text)
    }

    // Called by MainActivity.onNewIntent when the app is warm-started with a share
    fun emitSharedText(text: String) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT, text)
    }

    // Required for RN event emitter subscription
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
