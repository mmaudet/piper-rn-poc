# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# sherpa-onnx native classes — referenced via JNI, R8 must not strip
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keepclassmembers class com.k2fsa.sherpa.onnx.** { *; }

# react-native-sherpa-onnx wrapper module
-keep class com.sherpaonnx.** { *; }
-keepclassmembers class com.sherpaonnx.** { *; }

# @dr.pogodin/react-native-fs
-keep class com.drpogodin.reactnativefs.** { *; }
-keepclassmembers class com.drpogodin.reactnativefs.** { *; }

# react-native-sound
-keep class com.zmxv.RNSound.** { *; }
-keepclassmembers class com.zmxv.RNSound.** { *; }

# @kesha-antonov/react-native-background-downloader
-keep class com.eko.** { *; }
-keepclassmembers class com.eko.** { *; }

# @react-native-community/slider
-keep class com.reactnativecommunity.slider.** { *; }
-keepclassmembers class com.reactnativecommunity.slider.** { *; }
