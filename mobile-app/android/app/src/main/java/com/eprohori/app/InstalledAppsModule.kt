package com.eprohori.app

import android.content.pm.ApplicationInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// N7: lists installed user apps (packageName + appName) for the fake-app scanner.
// Requires QUERY_ALL_PACKAGES in the manifest.
class InstalledAppsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "InstalledApps"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = ctx.packageManager
            val apps = pm.getInstalledApplications(0)
            val result = Arguments.createArray()
            for (app in apps) {
                // Skip system apps — fake banking apps are always user-installed
                if (app.flags and ApplicationInfo.FLAG_SYSTEM != 0) continue
                val map = Arguments.createMap()
                map.putString("packageName", app.packageName)
                map.putString("appName", pm.getApplicationLabel(app).toString())
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SCAN_FAILED", e.message, e)
        }
    }
}
