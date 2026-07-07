package com.eprohori.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

// P1: Chat Guard — reads incoming chat-app notifications and forwards the
// message text to JS for on-device scam analysis. Requires the user to grant
// Notification Access in system settings.
class NotifListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotifListener"

        // Watched packages → display name shown in the warning
        val WATCHED: Map<String, String> = mapOf(
            "com.whatsapp"              to "WhatsApp",
            "com.whatsapp.w4b"          to "WhatsApp Business",
            "org.telegram.messenger"    to "Telegram",
            "com.facebook.orca"         to "Messenger",
            "com.facebook.katana"       to "Facebook",
            "com.instagram.android"     to "Instagram",
            "com.google.android.gm"     to "Gmail",
            "com.linkedin.android"      to "LinkedIn",
            "com.viber.voip"            to "Viber",
            "com.imo.android.imoim"     to "imo",
        )

        // Small in-memory dedupe: notifications repost the same text repeatedly
        private val recentHashes = object : LinkedHashMap<Int, Long>(32, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Int, Long>?) = size > 64
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            val pkg = sbn.packageName ?: return
            if (pkg == packageName) return
            val appName = WATCHED[pkg] ?: return

            val n = sbn.notification ?: return
            // Skip group summaries and ongoing/silent housekeeping notifications
            if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
            if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return

            val extras = n.extras ?: return
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text  = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: return
            if (text.isBlank() || text.length < 8) return

            // Dedupe identical payloads seen in the last 60 s
            val hash = (pkg + title + text).hashCode()
            val now  = System.currentTimeMillis()
            synchronized(recentHashes) {
                val last = recentHashes[hash]
                if (last != null && now - last < 60_000) return
                recentHashes[hash] = now
            }

            Log.d(TAG, "Chat notification from $appName (${text.length} chars)")
            NotifListenerModule.handleChatNotification(pkg, appName, title, text.take(2000))
        } catch (e: Exception) {
            Log.e(TAG, "onNotificationPosted error", e)
        }
    }
}
