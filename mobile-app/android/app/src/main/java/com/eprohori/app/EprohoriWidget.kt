package com.eprohori.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

// R1: Home screen widget — two quick-action buttons (Analyze + CallerID)
// S7: also shows today's scan/threat counts, synced from JS via WidgetStatsModule
class EprohoriWidget : AppWidgetProvider() {

    companion object {
        // Called by WidgetStatsModule right after JS updates SharedPreferences,
        // so the widget refreshes immediately instead of waiting for the next onUpdate.
        fun refreshAll(context: Context, manager: AppWidgetManager, ids: IntArray) {
            ids.forEach { id -> updateWidget(context, manager, id) }
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_eprohori)

            val prefs = context.getSharedPreferences(WidgetStatsModule.PREFS, Context.MODE_PRIVATE)
            val scans = prefs.getInt(WidgetStatsModule.KEY_SCANS, 0)
            val threats = prefs.getInt(WidgetStatsModule.KEY_THREATS, 0)
            val statsText = when {
                scans <= 0 -> "আজ এখনো কোনো স্ক্যান হয়নি"
                threats > 0 -> "আজ: $scans স্ক্যান · ⚠️ $threats হুমকি"
                else -> "আজ: $scans স্ক্যান · সব নিরাপদ ✓"
            }
            views.setTextViewText(R.id.widget_stats, statsText)

            // "বার্তা বিশ্লেষণ" button — deep-links to Analyzer screen
            val analyzeIntent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data   = android.net.Uri.parse("eprohori://analyze")
                flags  = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val analyzePi = PendingIntent.getActivity(
                context, 0, analyzeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_analyze, analyzePi)

            // "নম্বর চেক" button — deep-links to CallerID screen
            val callerIntent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data   = android.net.Uri.parse("eprohori://callerid")
                flags  = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val callerPi = PendingIntent.getActivity(
                context, 1, callerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_caller, callerPi)

            manager.updateAppWidget(widgetId, views)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { id ->
            updateWidget(context, appWidgetManager, id)
        }
    }
}
