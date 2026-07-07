package com.eprohori.app
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    // Capture cold-start share intent before JS bridge is ready
    ShareIntentModule.handleIntent(intent)
    super.onCreate(null)
  }

  // Called when the app is already running and user shares to it again
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    ShareIntentModule.handleIntent(intent)
    // If bridge is already live, emit the event directly
    val text = ShareIntentModule.pendingSharedText ?: return
    ShareIntentModule.pendingSharedText = null
    val pkg = reactInstanceManager
      ?.currentReactContext
      ?.getNativeModule(ShareIntentModule::class.java)
    pkg?.emitSharedText(text)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
