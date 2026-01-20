# Setup Instructions

## Prerequisites Installation

### 1. Install Node.js
- **Recommended Version**: Node.js v18.x or v20.x LTS
- Download from: https://nodejs.org/
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. Install Expo CLI Globally
```bash
npm install -g expo-cli@latest
```

Alternatively, you can use npx (no global install needed):
```bash
npx expo-cli@latest start
```

## Project Setup

### 1. Navigate to Project Directory
```bash
cd /path/to/pottiPuzzles
```

### 2. Install Project Dependencies
```bash
npm install
```

If you encounter issues, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 3. Verify Installation
Check that all dependencies are installed:
```bash
npm list --depth=0
```

## Running the Project

### Start Development Server
```bash
npm start
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Display a QR code in the terminal

### Run on Different Platforms

**iOS Simulator (macOS only):**
```bash
npm start
# Then press 'i' in the terminal
```

**Android Emulator:**
```bash
npm start
# Then press 'a' in the terminal
```

**Web Browser:**
```bash
npm start
# Then press 'w' in the terminal
```

**Physical Device:**
- Install "Expo Go" app from App Store (iOS) or Google Play (Android)
- Scan the QR code displayed in the terminal
- Make sure your device and computer are on the same network

## Project Dependencies

This project uses:
- **Expo SDK**: ~54.0.0
- **React**: 19.1.0
- **React Native**: 0.81.5
- **react-native-gesture-handler**: ~2.28.0
- **react-native-reanimated**: ~4.1.1
- **react-native-svg**: 15.12.1
- **expo-image-picker**: ~17.0.10
- **expo-linear-gradient**: ~15.0.8

## Troubleshooting

### Clear Cache
If you encounter build or cache issues:
```bash
expo start -c
# or
npm start -- --clear
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Node Version Issues
If you encounter compatibility issues, use Node Version Manager (nvm):
```bash
# Install nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js v18
nvm install 18
nvm use 18
```

### Android Studio Setup (for Android development)
1. Install Android Studio from: https://developer.android.com/studio
2. Install Android SDK and create an emulator
3. Set ANDROID_HOME environment variable:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   export ANDROID_HOME=$HOME/Android/Sdk          # Linux
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Xcode Setup (for iOS development - macOS only)
1. Install Xcode from App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Open Xcode and accept license agreements
4. Install iOS Simulator from Xcode > Preferences > Components

## Quick Start Command Summary

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start

# 3. In the terminal, press:
#    - 'i' for iOS simulator
#    - 'a' for Android emulator
#    - 'w' for web browser
#    - Scan QR code for physical device
```

## Verification Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed
- [ ] Dependencies installed (`npm install` completed successfully)
- [ ] Expo CLI installed globally or using npx
- [ ] Development server starts without errors
- [ ] App loads on your chosen platform

## Additional Notes

- The project uses Expo SDK 54, which is compatible with React Native 0.81.5
- All native modules are handled by Expo, no native build required for development
- For production builds, you may need additional setup (EAS Build or Expo Build)
