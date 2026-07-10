package com.eprohori.app

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class CallLogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object { private const val TAG = "CallLogModule" }

    override fun getName(): String = "CallLogReader"

    @ReactMethod
    fun getRecentCalls(limit: Int, promise: Promise) {
        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_CALL_LOG)
            != PackageManager.PERMISSION_GRANTED
        ) {
            promise.reject("PERMISSION_DENIED", "READ_CALL_LOG permission not granted")
            return
        }

        try {
            val calls = Arguments.createArray()
            val projection = arrayOf(
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,
                CallLog.Calls.CACHED_NAME,
            )
            val cursor = reactContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null, null,
                "${CallLog.Calls.DATE} DESC LIMIT $limit"
            ) ?: run { promise.resolve(calls); return }

            cursor.use { c ->
                val numIdx      = c.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIdx     = c.getColumnIndex(CallLog.Calls.TYPE)
                val dateIdx     = c.getColumnIndex(CallLog.Calls.DATE)
                val durIdx      = c.getColumnIndex(CallLog.Calls.DURATION)
                val nameIdx     = c.getColumnIndex(CallLog.Calls.CACHED_NAME)

                while (c.moveToNext()) {
                    val type = when (c.getInt(typeIdx)) {
                        CallLog.Calls.INCOMING_TYPE  -> "incoming"
                        CallLog.Calls.OUTGOING_TYPE  -> "outgoing"
                        CallLog.Calls.MISSED_TYPE    -> "missed"
                        CallLog.Calls.REJECTED_TYPE  -> "rejected"
                        CallLog.Calls.BLOCKED_TYPE   -> "blocked"
                        else                         -> "unknown"
                    }
                    val map = Arguments.createMap().apply {
                        putString("number",   c.getString(numIdx)  ?: "")
                        putString("type",     type)
                        putDouble("date",     c.getLong(dateIdx).toDouble())
                        putInt("duration",    c.getInt(durIdx))
                        putString("name",     c.getString(nameIdx) ?: "")
                    }
                    calls.pushMap(map)
                }
            }
            promise.resolve(calls)
        } catch (e: Exception) {
            Log.e(TAG, "getRecentCalls failed", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestCallLogPermission(promise: Promise) {
        // Permission must be requested from UI — JS should use PermissionsAndroid
        promise.resolve(
            ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_CALL_LOG)
                == PackageManager.PERMISSION_GRANTED
        )
    }
}
