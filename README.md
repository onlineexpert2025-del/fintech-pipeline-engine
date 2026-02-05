# GoalPulse

A privacy-focused financial tracking app with offline receipt scanning, goal tracking, and variable daily savings challenges.

## Features

- **Private Receipt Scanner** – Capture receipts locally, extract total/date/store via on-device ML Kit OCR
- **House Goal Calculator** – Track savings toward goals (e.g. $22k house) with progress and time estimate
- **Variable Daily Savings** – Randomized daily targets that sum to your monthly goal
- **Biometric Lock** – Optional Face ID/Fingerprint app lock (no lock when camera is open)
- **Offline-first** – All data stored locally with expo-sqlite

## Tech Stack

- Expo (React Native)
- expo-router (file-based routing)
- @react-native-ml-kit/text-recognition (on-device OCR)
- expo-sqlite (local database)
- expo-local-authentication (biometrics)
- expo-camera

## Development

```bash
npm install
npm start
```

**Note:** `@react-native-ml-kit/text-recognition` requires a **development build**. Expo Go will not run the receipt scanner. Build with EAS:

```bash
npx eas build --platform android --profile development
```

## Build APK

```bash
npx eas build --platform android --profile preview
```

Or for production:

```bash
npx eas build --platform android --profile production
```

## Configuration

- `app.json` – Plugins, permissions, and app metadata
- `eas.json` – EAS Build profiles (development, preview, production)
- `index.js` – Entry point with `react-native-gesture-handler` at top
- `babel.config.js` – Includes `react-native-reanimated/plugin`

## Privacy

- OCR runs locally via ML Kit
- No cloud sync; data stays on device
- Receipt images stored in app document directory
- Temporary scan files deleted after extraction
