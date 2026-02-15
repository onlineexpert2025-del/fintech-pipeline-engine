# 🏗️ Build Instructions - GoalPulse

## Prerequisites

1. **Node.js 18+** or **Node.js 20+**
   ```bash
   node --version
   ```

2. **Yarn 4.x** (included in project)
   ```bash
   yarn --version
   ```

3. **EAS CLI** (Expo Application Services)
   ```bash
   npm install -g eas-cli
   eas --version  # Should be 13.2.0+
   ```

4. **Expo Account** (free)
   - Sign up at: https://expo.dev/signup

---

## 🚀 Step-by-Step Build Process

### Step 1: Install Dependencies

```bash
cd react_native_space
yarn install
```

**Expected output:**
```
✅ Done with warnings in ~10s
```

### Step 2: Verify Setup (Optional but Recommended)

```bash
npx expo-doctor
```

**Expected output:**
```
✅ Running 17 checks on your project...
✅ 17/17 checks passed. No issues detected!
```

### Step 3: Login to Expo

```bash
npx eas login
```

Enter your Expo credentials.

### Step 4: Configure EAS Build (First Time Only)

```bash
npx eas build:configure
```

**This will:**
1. Create/update `eas.json` (already included)
2. Link your project to your Expo account
3. Generate a project ID

**You'll be asked:**
- "What would you like your Android application id to be?"
  - Press Enter to use default: `com.goalpulse.app`

### Step 5: Build Android APK (Preview)

```bash
npx eas build --profile preview --platform android
```

**Build process:**
1. 📦 Uploads your project to EAS servers
2. 🔨 Builds APK on cloud (takes ~5-10 minutes)
3. 📲 Provides download link when complete

**Expected output:**
```
✔ Build started, it may take a few minutes to complete.
✔ You can monitor it at https://expo.dev/accounts/.../builds/...
```

**When complete:**
```
✔ Build finished!
✔ APK: https://expo.dev/artifacts/.../build-123.apk
```

### Step 6: Download & Install APK

1. Click the APK link from EAS output
2. Transfer to Android device
3. Install the APK (enable "Install from Unknown Sources" if needed)

---

## 🎯 Build Profiles

### Preview Profile (APK)
**Use for:** Testing on physical devices
```bash
npx eas build --profile preview --platform android
```
- Builds APK (can be directly installed)
- Internal distribution
- Faster builds (~5-10 min)

### Production Profile (AAB)
**Use for:** Google Play Store submission
```bash
npx eas build --profile production --platform android
```
- Builds AAB (Android App Bundle)
- Required for Play Store
- Optimized for production

---

## 🛠️ Local Development (Optional)

### Run on Web (Quick Testing)
```bash
npx expo start --web
```

### Run on Android Emulator
```bash
npx expo start --android
```
*Requires Android Studio and emulator setup*

### Run on iOS Simulator (macOS only)
```bash
npx expo start --ios
```
*Requires Xcode*

### Test with Expo Go App
```bash
npx expo start
```
Scan QR code with Expo Go app (iOS/Android)

**⚠️ Note:** Some features (notifications, camera) may not work in Expo Go. Use standalone build for full testing.

---

## 📱 iOS Build (Optional)

### Requirements
1. **Apple Developer Account** ($99/year)
2. **macOS computer** (for local builds) OR use EAS Build (cloud)

### Build iOS with EAS (Recommended)
```bash
npx eas build --profile preview --platform ios
```

---

## 🐛 Troubleshooting

### "Command not found: eas"
```bash
npm install -g eas-cli
```

### "expo-doctor fails"
```bash
npx expo install --fix
```

### "Build fails on EAS"
1. Check build logs: `npx eas build:list`
2. Click on failed build to see detailed logs
3. Common issues:
   - Gradle timeout: Retry build
   - Dependency mismatch: Run `npx expo install --fix`

### "Cannot install APK"
- Enable "Install from Unknown Sources" in Android settings
- Or: Settings → Security → Unknown Sources → Enable

### "Notifications don't work"
- Notifications only work in **standalone builds** (not Expo Go)
- Ensure you built with `eas build`, not running with `expo start`

---

## 📦 What Gets Built

### APK Contents
- ✅ All app screens and features
- ✅ Embedded SQLite database
- ✅ Camera access for receipt scanning
- ✅ Notification support
- ✅ All assets (icons, images)
- ✅ Optimized JavaScript bundle

### APK Size
~40-60 MB (typical for Expo apps)

---

## 🚀 Next Steps After Build

1. **Test thoroughly** on real devices
2. **Collect feedback** from users
3. **Fix bugs** if found
4. **Build production AAB** for Play Store
5. **Submit to Google Play Console**

---

## 📞 Additional Resources

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Expo CLI Docs:** https://docs.expo.dev/workflow/expo-cli/
- **Troubleshooting:** https://docs.expo.dev/build-reference/troubleshooting/

---

**Good luck with your build! 🎉**
