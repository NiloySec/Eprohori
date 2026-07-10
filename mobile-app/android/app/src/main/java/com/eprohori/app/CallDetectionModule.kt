package com.eprohori.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

@Suppress("DEPRECATION")
class CallDetectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG    = "CallDetectionModule"
        private const val MODULE = "CallDetection"
        private const val EVENT  = "CallStateChanged"
    }

    private var telephonyManager: TelephonyManager? = null
    private var listener: PhoneStateListener? = null
    private var isListening = false

    override fun getName(): String = MODULE

    @ReactMethod
    fun startCallStateUpdates() {
        if (isListening) return
        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "READ_PHONE_STATE permission not granted")
            return
        }

        telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        listener = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, incomingNumber: String?) {
                val stateName = when (state) {
                    TelephonyManager.CALL_STATE_RINGING     -> "Ringing"
                    TelephonyManager.CALL_STATE_OFFHOOK     -> "Connected"
                    TelephonyManager.CALL_STATE_IDLE        -> "Disconnected"
                    else                                     -> "Unknown"
                }
                val params = Arguments.createMap().apply {
                    putString("state", stateName)
                    // incomingNumber is null on Android 11+ for privacy reasons
                    if (!incomingNumber.isNullOrBlank()) putString("phoneNumber", incomingNumber)
                    else putNull("phoneNumber")
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT, params)
            }
        }

        telephonyManager?.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
        isListening = true
    }

    @ReactMethod
    fun stopCallStateUpdates() {
        listener?.let { telephonyManager?.listen(it, PhoneStateListener.LISTEN_NONE) }
        listener = null
        telephonyManager = null
        isListening = false
    }

    // Required for RN event emitter subscription
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
