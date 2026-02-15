# ML Kit Text Recognition ProGuard Rules
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.**

# React Native ML Kit
-keep class com.reactnativemlkit.** { *; }
-dontwarn com.reactnativemlkit.**

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}
