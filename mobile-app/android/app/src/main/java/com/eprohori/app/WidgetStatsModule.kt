package com.eprohori.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// S7: JS bridge that pushes today's scan/threat counts into the home widget.
// Writes to SharedPreferences (read by EprohoriWidget on every onUpdate) and
// forces an immediate refresh of any placed widget instances.
class WidgetStatsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    companion object {
        const val PREFS = "eprohori_widget_stats"
        const val KEY_SCANS = "scans_today"
        const val KEY_THREATS = "threats_today"
    }

    override fun getName(): String = "WidgetStats"

    @ReactMethod
    fun updateStats(scansToday: Int, threatsToday: Int, promise: Promise) {
        try {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putInt(KEY_SCANS, scansToday)
                .putInt(KEY_THREATS, threatsToday)
                .apply()

            val manager = AppWidgetManager.getInstance(ctx)
            val ids = manager.getAppWidgetIds(ComponentName(ctx, EprohoriWidget::class.java))
            if (ids.isNotEmpty()) {
                EprohoriWidget.refreshAll(ctx, manager, ids)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_FAILED", e.message, e)
        }
    }
}
