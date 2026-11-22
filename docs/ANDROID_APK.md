# Android APK prototype

Living World is packaged for Android with Capacitor 8. The Android app loads the same Vite production bundle as the browser app in a local Android WebView; it does not reimplement the simulation natively.

## Build

Requirements: Node.js 22 or newer, Android Studio with an Android SDK installed, and an Android device or emulator for a runtime check. Capacitor 8 supports Android API 24 and newer.

From the repository root on Windows:

```powershell
npm ci
npm run android:sync
Set-Location android
.\gradlew.bat assembleDebug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Alternatively, run `npm run android:open`, then build or launch the `android/` project from Android Studio.

`npm run android:sync` builds the Vite app and copies `dist/` into the native project. Run it after web-source changes before building the APK.

## Prototype limits

- The wrapper uses the existing mobile viewport and touch interactions; the full viewer has not yet been assessed on a physical phone.
- Android file export/import and performance on lower-end devices still need device verification.
- The current debug APK was built with a temporary JDK 21 and Android SDK 36 toolchain. No Android phone or emulator was attached, so device installation and runtime behavior remain unverified.
