# Setup Instructions

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

3. Run on your device:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## Project Structure

```
pottiPuzzles/
├── App.js                 # Main app component
├── app.json               # Expo configuration
├── package.json          # Dependencies
├── babel.config.js       # Babel configuration
├── src/
│   ├── components/      # React components
│   │   ├── ImagePicker.js
│   │   ├── GameBoard.js
│   │   ├── PuzzlePiece.js
│   │   ├── Header.js
│   │   ├── DifficultySelector.js
│   │   ├── Confetti.js
│   │   └── CompletionModal.js
│   ├── constants/
│   │   └── colors.js    # Color scheme
│   └── utils/
│       └── puzzleUtils.js # Puzzle logic utilities
└── assets/              # Images and assets (create as needed)
```

## Features Implemented

✅ Image picker (gallery/camera)
✅ Image slicing into puzzle pieces
✅ Drag and drop gestures
✅ Piece snapping
✅ Difficulty selection (3x3, 4x4, 6x6)
✅ Timer and move counter
✅ Completion detection
✅ Confetti animation
✅ Local storage (AsyncStorage)
✅ Modern UI with gradient design

## Notes

- The app uses Expo Image Picker which requires camera/gallery permissions
- Puzzle pieces are created by slicing the original image
- Game progress is saved locally using AsyncStorage
- The app supports different difficulty levels with varying grid sizes

## Troubleshooting

If you encounter issues:
1. Clear cache: `expo start -c`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check that all permissions are granted on your device
