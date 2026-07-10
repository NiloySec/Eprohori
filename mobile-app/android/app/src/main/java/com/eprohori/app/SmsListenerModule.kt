package com.eprohori.app

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsListenerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SmsListenerModule"
        private const val EVENT = "SmsReceived"

        var pendingSms: String? = null
        private var instance: SmsListenerModule? = null

        fun handleIncomingSms(text: String) {
            val mod = instance
            if (mod != null && mod.reactContext.hasActiveReactInstance()) {
                mod.emitSms(text)
            } else {
                pendingSms = text
            }
        }
    }

    init { instance = this }

    override fun getName(): String = "SmsListener"

    // Required for NativeEventEmitter compatibility
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod
    fun getIncomingSms(promise: Promise) {
        promise.resolve(pendingSms)
        pendingSms = null
    }

    fun emitSms(text: String) {
        if (!reactContext.hasActiveReactInstance()) return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT, text)
            Log.d(TAG, "Emitted SmsReceived")
        } catch (e: Exception) {
            Log.e(TAG, "emit error", e)
        }
    }

    override fun invalidate() {
        super.invalidate()
        if (instance === this) instance = null
    }
}
