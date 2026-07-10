package com.eprohori.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    companion object { private const val TAG = "SmsReceiver" }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        try {
            @Suppress("UNCHECKED_CAST", "DEPRECATION")
            val pdus = intent.extras?.get("pdus") as? Array<Any> ?: return
            val format = intent.extras?.getString("format") ?: "3gpp"

            val body = pdus.joinToString("") { pdu ->
                SmsMessage.createFromPdu(pdu as ByteArray, format).messageBody ?: ""
            }
            if (body.isNotBlank()) {
                Log.d(TAG, "SMS received (${body.length} chars)")
                SmsListenerModule.handleIncomingSms(body)
            }
        } catch (e: Exception) {
            Log.e(TAG, "onReceive error", e)
        }
    }
}
