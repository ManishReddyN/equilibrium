# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Standard RN + Firebase + Reanimated keep rules (plan section 6.1). Most native modules used
# in this project ship their own consumer ProGuard rules bundled in their AAR (auto-merged by
# R8, no action needed here) -- these are defensive explicit rules for the libraries the plan
# calls out by name, kept regardless of whether the bundled consumer rules already cover them.
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class io.invertase.notifee.** { *; }
-keep class com.tencent.mmkv.** { *; }
