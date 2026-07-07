package com.eprohori.app

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import androidx.annotation.RequiresApi

// P3: official Android call-screening — blocks blocklisted spam numbers
// BEFORE the phone rings. Active only when the user grants EProhori the
// ROLE_CALL_SCREENING role (Android 10+).
// The blocklist snapshot is synced from JS into SharedPreferences because
// this service may run without a live React context.
@RequiresApi(Build.VERSION_CODES.N)
class CallScreenService : CallScreeningService() {

    companion object {
        private const val TAG = "CallScreenService"
        const val PREFS = "eprohori_callscreen"
        const val KEY_BLOCKLIST = "blocklist_digits"
    }

    override fun onScreenCall(callDetails: Call.Details) {
        // Only screen incoming calls (API 29+ exposes direction)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            callDetails.callDirection != Call.Details.DIRECTION_INCOMING
        ) {
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val rawNumber = callDetails.handle?.schemeSpecificPart ?: ""
        val digits = rawNumber.replace(Regex("\\D"), "")

        val blocked = try {
            val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
            val list = prefs.getStringSet(KEY_BLOCKLIST, emptySet()) ?: emptySet()
            // Exact digit match only — suffix/prefix matching risks blocking
            // unrelated numbers (see CallerIDScreen.isBlocked for the same fix on the JS side).
            digits.isNotEmpty() && list.contains(digits)
        } catch (e: Exception) {
            Log.e(TAG, "prefs read error", e)
            false
        }

        val response = if (blocked) {
            Log.d(TAG, "Blocking spam call before ring")
            CallResponse.Builder()
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipCallLog(false)      // keep evidence in call log
                .setSkipNotification(true)  // no missed-call spam notification
                .build()
        } else {
            CallResponse.Builder().build() // allow normally
        }
        respondToCall(callDetails, response)
    }
}
