package com.eprohori.app

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.*

// P3: JS bridge for the call-screening role + blocklist sync
class CallScreenModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object { private const val REQUEST_CODE = 4471 }

    override fun getName(): String = "CallScreen"

    // Is call screening supported on this device? (Android 10+)
    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
    }

    // Does EProhori currently hold ROLE_CALL_SCREENING?
    @ReactMethod
    fun isRoleHeld(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { promise.resolve(false); return }
        try {
            val rm = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
            promise.resolve(rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // Show the system dialog asking the user to make EProhori the screening app
    @ReactMethod
    fun requestRole(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve(false); return
        }
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) { promise.resolve(false); return }
        try {
            val rm = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
            if (rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
                promise.resolve(true); return
            }
            val intent = rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
            activity.startActivityForResult(intent, REQUEST_CODE)
            // Result arrives via activity callback; JS re-checks with isRoleHeld()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // Sync the user's blocklist into SharedPreferences for CallScreenService
    @ReactMethod
    fun updateBlocklist(numbers: ReadableArray, promise: Promise) {
        try {
            val digitsSet = HashSet<String>()
            for (i in 0 until numbers.size()) {
                val d = (numbers.getString(i) ?: "").replace(Regex("\\D"), "")
                if (d.length >= 3) digitsSet.add(d)
            }
            reactContext
                .getSharedPreferences(CallScreenService.PREFS, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(CallScreenService.KEY_BLOCKLIST, digitsSet)
                .apply()
            promise.resolve(digitsSet.size)
        } catch (e: Exception) {
            promise.reject("SYNC_FAILED", e.message, e)
        }
    }
}
