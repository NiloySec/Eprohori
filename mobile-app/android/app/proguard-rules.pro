# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class expo.modules.kotlin.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.fresco.** { *; }

# Custom Native Modules
-keep class com.eprohori.app.** { *; }

# Kotlin
-keep class kotlin.reflect.jvm.internal.** { *; }
-keep class kotlin.Metadata { *; }

# React Native internals
-keep class com.facebook.react.bridge.CatalystInstanceImpl { *; }
-keep class com.facebook.react.bridge.WritableNativeMap { *; }
-keep class com.facebook.react.bridge.ReadableNativeMap { *; }
-keep class com.facebook.react.bridge.WritableNativeArray { *; }
-keep class com.facebook.react.bridge.ReadableNativeArray { *; }

# Google / GMS
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# OkHttp
-keepattributes Signature, InnerClasses, EnclosingMethod
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Add any project specific keep options here:
-ignorewarnings
-dontwarn expo.modules.**
-dontwarn com.facebook.react.**
-dontwarn com.swmansion.**
-dontwarn javax.annotation.**
