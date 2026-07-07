package com.eprohori.app

import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

// P1: JS bridge for the Chat Guard notification listener
class NotifListenerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NotifListenerModule"
        private const val EVENT = "ChatNotifReceived"

        private var pending: WritableMap? = null
        private var instance: NotifListenerModule? = null

        fun handleChatNotification(pkg: String, appName: String, title: String, text: String) {
            val map = Arguments.createMap().apply {
                putString("package", pkg)
                putString("app", appName)
                putString("title", title)
                putString("text", text)
            }
            val mod = instance
            if (mod != null && mod.reactContext.hasActiveReactInstance()) {
                mod.emitNotif(map)
            } else {
                pending = map
            }
        }
    }

    init { instance = this }

    override fun getName(): String = "NotifListener"

    // Required for NativeEventEmitter compatibility
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod
    fun getPendingNotification(promise: Promise) {
        promise.resolve(pending)
        pending = null
    }

    // Has the user granted Notification Access to EProhori?
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            val enabled = Settings.Secure.getString(
                reactContext.contentResolver, "enabled_notification_listeners"
            ) ?: ""
            promise.resolve(enabled.contains(reactContext.packageName))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // Open the system Notification Access settings page
    @ReactMethod
    fun openNotificationAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "openSettings error", e)
        }
    }

    fun emitNotif(map: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT, map)
        } catch (e: Exception) {
            Log.e(TAG, "emit error", e)
        }
    }

    override fun invalidate() {
        super.invalidate()
        if (instance === this) instance = null
    }
}
