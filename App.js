import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  PixelRatio,
  Platform,
  AppState,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, Easing } from 'react-native-reanimated';

// Spring config for smooth screen transitions on Android
const SCREEN_SPRING_CONFIG = {
  damping: 22,
  stiffness: 200,
  mass: 0.8,
};
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { DifficultyModal } from './src/components/DifficultyModal';
import { PaperBackground } from './src/components/PaperBackground';
import { GameBoard } from './src/components/GameBoard';
import { PuzzlePieceHolder } from './src/components/PuzzlePieceHolder';
import { GameStats } from './src/components/GameStats';
import { CompletionScreen } from './src/components/CompletionScreen';
import { LoadingScreen } from './src/components/LoadingScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { SettingsScreen } from './src/components/SettingsScreen';
import { CalendarScreen } from './src/components/CalendarScreen';
import AuthScreen from './src/components/AuthScreen';
import { CalendarProvider, useCalendar } from './src/contexts/CalendarContext';
import { GameProvider } from './src/contexts/GameContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NavigationBar } from './src/components/NavigationBar';
import { generatePuzzle, shuffleArray } from './src/utils/puzzleUtils';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    background: { flex: 1 },
    contentWrapper: { flex: 1 },
    gameScreen: { flex: 1, width: '100%', paddingHorizontal: 20 },
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 0,
      width: '100%',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    gameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 },
    holderContainer: { width: '100%', alignItems: 'center', marginBottom: 16 },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 0,
      paddingBottom: 40,
      width: '100%',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.buttonBg,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      gap: 8,
      flex: 0,
    },
    actionButtonText: { color: theme.buttonText, fontSize: 14, fontWeight: '600' },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.surface,
      opacity: 0.95,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingText: { fontSize: 18, fontWeight: '600', color: theme.text },
    screenContainer: { flex: 1, width: '100%', backgroundColor: theme.screenBackground },
    navigationWrapper: { flex: 1, width: '100%' },
    screensContainer: { flex: 1, width: '100%' },
    screenLayer: { 
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.screenBackground,
    },
    screenLayerHidden: {
      opacity: 0,
      pointerEvents: 'none',
    },
  });

function AppContent() {
  const { theme } = useTheme();
  const { setPendingNavigation, triggerSync } = useCalendar();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const appStateRef = useRef(AppState.currentState);
  const [showAuthScreen, setShowAuthScreen] = useState(true);

  // Sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        triggerSync();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isAuthenticated, triggerSync]);

  // Hide auth screen once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setShowAuthScreen(false);
    }
  }, [isAuthenticated]);

  const handleSkipAuth = useCallback(() => {
    setShowAuthScreen(false);
  }, []);

  const HEADER_HEIGHT = 100;
  const HOLDER_HEIGHT = 140;
  const ACTION_BUTTONS_HEIGHT = 70;
  const EQUAL_SPACING = 16;
  const HORIZONTAL_PADDING = 40;
  const BOARD_BORDER_WIDTH = 2;
  const MIN_LOADING_TIME = 2000; // Minimum 2 seconds for loading screen visibility
  const POSITION_TOLERANCE = 2;

  const [difficulty, setDifficulty] = useState({ rows: 3, cols: 3 });
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showGameScreen, setShowGameScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [puzzleData, setPuzzleData] = useState(null);
  const [holderPieces, setHolderPieces] = useState([]);
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState(false);
  const [boardPieces, setBoardPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedPiece2, setSelectedPiece2] = useState(null);
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const loadingStartTimeRef = useRef(null);
  const pendingGameScreenRef = useRef(false);
  const contentOpacity = useSharedValue(1);
  const originalHolderOrderRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Home');

  useEffect(() => {
    if (!showGameScreen) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimer(0);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [showGameScreen]);

  useEffect(() => {
    if (showGameScreen && isPuzzleComplete() && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [showGameScreen, boardPieces, holderPieces, puzzleData]);

  const handleNewGame = () => {
    setShowDifficultyModal(true);
  };

  const requestPermissions = async () => {
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Photo library permission is needed to create puzzles.'
      );
      return false;
    }
    return true;
  };

  // Helper to parse date from filename (e.g., IMG-20240115-WA0001.jpg, IMG_20240115_123456.jpg)
  const parseDateFromFilename = (filename) => {
    if (!filename) return null;
    
    // Match patterns like: 20240115, 2024-01-15, 2024_01_15
    const patterns = [
      /(\d{4})(\d{2})(\d{2})/, // 20240115
      /(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
      /(\d{4})_(\d{2})_(\d{2})/, // 2024_01_15
    ];
    
    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const [, year, month, day] = match;
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        // Validate the date is reasonable
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    return null;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let creationDate = null;
        
        // 1. Try EXIF data (most accurate for camera photos)
        if (asset.exif) {
          const exifDate = asset.exif.DateTimeOriginal || asset.exif.DateTime || asset.exif.DateTimeDigitized;
          if (exifDate) {
            const parts = exifDate.split(' ')[0].split(':');
            if (parts.length === 3) {
              creationDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
          }
        }
        
        // 2. Try MediaLibrary for asset metadata
        if (!creationDate) {
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
              let mediaAsset = null;
              
              // Use assetId directly if available
              if (asset.assetId) {
                mediaAsset = await MediaLibrary.getAssetInfoAsync(asset.assetId);
              }
              
              // On Android, fileName might be a Media Store ID (numeric)
              if (!mediaAsset && asset.fileName) {
                const baseFileName = asset.fileName.replace(/\.[^/.]+$/, '');
                const isNumericId = /^\d+$/.test(baseFileName);
                
                if (isNumericId) {
                  // Try using numeric ID directly
                  try {
                    mediaAsset = await MediaLibrary.getAssetInfoAsync(baseFileName);
                  } catch {}
                  
                  // Search recent assets for matching ID
                  if (!mediaAsset) {
                    const { assets } = await MediaLibrary.getAssetsAsync({
                      first: 500,
                      mediaType: 'photo',
                      sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
                    });
                    
                    const matchById = assets.find(a => a.id === baseFileName || a.id.includes(baseFileName));
                    if (matchById) {
                      try {
                        mediaAsset = await MediaLibrary.getAssetInfoAsync(matchById.id);
                      } catch {
                        // Permission denied - use basic info or parse filename
                        if (matchById.modificationTime) {
                          const date = new Date(matchById.modificationTime);
                          creationDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        }
                        if (!creationDate && matchById.filename) {
                          creationDate = parseDateFromFilename(matchById.filename);
                        }
                      }
                    }
                  }
                }
              }
              
              if (mediaAsset && !creationDate) {
                const timestamp = mediaAsset.creationTime || mediaAsset.modificationTime;
                if (timestamp) {
                  const date = new Date(timestamp);
                  creationDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                }
              }
            }
          } catch {}
        }
        
        // 3. Try parsing date from filename
        if (!creationDate) {
          creationDate = parseDateFromFilename(asset.fileName);
        }
        
        // 4. Try parsing date from URI
        if (!creationDate) {
          const uriFilename = asset.uri.split('/').pop();
          creationDate = parseDateFromFilename(uriFilename);
        }
        
        return {
          uri: asset.uri,
          assetId: asset.assetId || null,
          fileName: asset.fileName || null,
          creationDate,
        };
      }
      return null;
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery.');
      return null;
    }
  };

  const clearSelection = () => {
    setSelectedPiece(null);
    setSelectedPiece2(null);
  };

  const clearGameState = () => {
    setTimer(0);
    setMoveCount(0);
    setPuzzleData(null);
    setHolderPieces([]);
    setBoardPieces([]);
    clearSelection();
    originalHolderOrderRef.current = [];
  };

  const calculateBoardDimensions = (rows, cols) => {
    const availableHeight = SCREEN_HEIGHT - HEADER_HEIGHT - HOLDER_HEIGHT - ACTION_BUTTONS_HEIGHT - (EQUAL_SPACING * 3);
    const maxBoardWidth = SCREEN_WIDTH - HORIZONTAL_PADDING;
    const maxBoardHeight = Math.max(availableHeight * 0.9, maxBoardWidth * 0.8);
    return {
      width: Math.floor(maxBoardWidth / cols) * cols,
      height: Math.floor(maxBoardHeight / rows) * rows,
    };
  };

  const startPuzzleWithImage = async (imageUri, selectedDifficulty, imageInfo = null) => {
    if (!imageUri) {
      return;
    }
    
    setDifficulty(selectedDifficulty);
    contentOpacity.value = 0;
    showLoadingScreenWithMessage('Preparing game...');

    setIsGeneratingPuzzle(true);
    setLoadingMessage('Generating puzzle...');
    
    try {
      // Calculate logical board dimensions (layout units)
      const { width: logicalBoardWidth, height: logicalBoardHeight } = calculateBoardDimensions(
        selectedDifficulty.rows,
        selectedDifficulty.cols
      );
      
      // Convert to pixel dimensions for sharp image generation
      // Cap scale at 2x to prevent processing oversized images (2x is sufficient for retina displays)
      const scale = Math.min(PixelRatio.get(), 2);
      const pixelBoardWidth = Math.round(logicalBoardWidth * scale);
      const pixelBoardHeight = Math.round(logicalBoardHeight * scale);
      
      const puzzle = await generatePuzzle(
        imageUri,
        selectedDifficulty.rows,
        selectedDifficulty.cols,
        pixelBoardWidth,
        pixelBoardHeight
      );
      
      // Add image identifiers for calendar matching
      if (imageInfo) {
        puzzle.sourceAssetId = imageInfo.assetId;
        puzzle.sourceFileName = imageInfo.fileName;
        puzzle.sourceCreationDate = imageInfo.creationDate; // YYYY-MM-DD or null
      }
      
      const shuffledPieces = shuffleArray(puzzle.pieces);
      setPuzzleData(puzzle);
      setHolderPieces(shuffledPieces);
      originalHolderOrderRef.current = shuffledPieces.map((p, index) => ({ id: p.id, index }));
      
      setIsGeneratingPuzzle(false);
      
      // Ensure loading screen stays visible for at least MIN_LOADING_TIME (2 seconds)
      const elapsedTime = Date.now() - loadingStartTimeRef.current;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Mark that we're ready to show game screen, then start exit animation
      // The game screen will be shown when LoadingScreen calls onExitComplete
      pendingGameScreenRef.current = true;
      setIsTransitioning(false);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      console.error(error);
      setIsGeneratingPuzzle(false);
      pendingGameScreenRef.current = false;
      
      // Wait minimum time even on error
      const elapsedTime = Date.now() - loadingStartTimeRef.current;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Start exit animation - handleLoadingExitComplete will hide the loading screen
      setIsTransitioning(false);
    }
  };

  const handleDifficultySelected = async (selectedDifficulty) => {
    const imageInfo = await pickImageFromGallery();
    if (!imageInfo) {
      return;
    }
    
    setShowDifficultyModal(false);
    await startPuzzleWithImage(imageInfo.uri, selectedDifficulty, imageInfo);
  };

  const resetGameState = async () => {
    contentOpacity.value = 0;
    showLoadingScreenWithMessage('Returning to menu...');
    
    // Set up destination screen while loading screen is visible
    setShowGameScreen(false);
    setShowCompletionModal(false);
    clearGameState();
    setCurrentRouteName('Home');
    
    // Wait for loading screen minimum time
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTransitioning(false);
  };

  const handleLoadingExitComplete = () => {
    // Loading screen exit animation is complete
    setShowLoadingScreen(false);
    contentOpacity.value = withTiming(1, { duration: 300 });
    
    // Show game screen if we're ready
    if (pendingGameScreenRef.current) {
      setShowGameScreen(true);
      setMoveCount(0);
      setTimer(0);
      setScrollResetKey((prev) => prev + 1);
      pendingGameScreenRef.current = false;
    }
  };

  const handlePlayAgain = async () => {
    contentOpacity.value = 0;
    showLoadingScreenWithMessage('Starting new game...');
    setShowCompletionModal(false);
    setShowGameScreen(false);
    clearGameState();
    setScrollResetKey((prev) => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsTransitioning(false);
    setTimeout(() => setShowDifficultyModal(true), 100);
  };

  const showLoadingScreenWithMessage = (message) => {
    loadingStartTimeRef.current = Date.now();
    setShowLoadingScreen(true);
    setIsTransitioning(true);
    setLoadingMessage(message);
  };

  const handleBackToMenu = resetGameState;
  const handleBackButton = resetGameState;

  const handleSettings = async () => {
    // Show loading screen and navigate to settings
    contentOpacity.value = 0;
    showLoadingScreenWithMessage('Opening settings...');
    
    // Set up destination screen while loading screen is visible
    setShowGameScreen(false);
    setShowCompletionModal(false);
    clearGameState();
    setCurrentRouteName('Settings');
    
    // Wait for loading screen minimum time
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTransitioning(false);
  };

  const handleCalendar = async (calendarInfo = null) => {
    // Show loading screen and navigate to calendar
    contentOpacity.value = 0;
    showLoadingScreenWithMessage('Opening calendar...');
    
    // Set up destination screen while loading screen is visible
    setShowGameScreen(false);
    setShowCompletionModal(false);
    clearGameState();
    
    // Set pending navigation if we have calendar info from completion screen
    if (calendarInfo) {
      if (calendarInfo.exists && calendarInfo.dateKey) {
        // Image exists - navigate to its date
        setPendingNavigation({
          dateKey: calendarInfo.dateKey,
          showAddPrompt: false,
        });
      } else if (calendarInfo.imageInfo) {
        // Image doesn't exist - navigate to creation date (or today if not available) and show add prompt
        let targetDateKey;
        if (calendarInfo.creationDate) {
          // Use the image's creation date (already in YYYY-MM-DD format)
          targetDateKey = calendarInfo.creationDate;
        } else {
          // Fallback to today's date
          const today = new Date();
          targetDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        setPendingNavigation({
          dateKey: targetDateKey,
          imageInfo: calendarInfo.imageInfo,
          showAddPrompt: true,
        });
      }
    }
    
    setCurrentRouteName('Calendar');
    
    // Wait for loading screen minimum time
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTransitioning(false);
  };

  const getBoardDimensions = () => {
    const availableHeight = SCREEN_HEIGHT - HEADER_HEIGHT - HOLDER_HEIGHT - ACTION_BUTTONS_HEIGHT - (EQUAL_SPACING * 3);
    const maxBoardWidth = SCREEN_WIDTH - HORIZONTAL_PADDING;
    const maxBoardHeight = Math.max(availableHeight * 0.9, maxBoardWidth * 0.8);

    if (!puzzleData) {
      return { width: maxBoardWidth, height: maxBoardHeight };
    }

    const availableContentWidth = maxBoardWidth - (BOARD_BORDER_WIDTH * 2);
    const availableContentHeight = maxBoardHeight - (BOARD_BORDER_WIDTH * 2);
    const calculatedPieceWidth = Math.floor(availableContentWidth / puzzleData.cols);
    const calculatedPieceHeight = Math.floor(availableContentHeight / puzzleData.rows);
    
    return {
      width: (calculatedPieceWidth * puzzleData.cols) + (BOARD_BORDER_WIDTH * 2),
      height: (calculatedPieceHeight * puzzleData.rows) + (BOARD_BORDER_WIDTH * 2)
    };
  };

  const getPieceDimensions = (actualBoardWidth, actualBoardHeight) => {
    const contentWidth = actualBoardWidth - (BOARD_BORDER_WIDTH * 2);
    const contentHeight = actualBoardHeight - (BOARD_BORDER_WIDTH * 2);
    const cols = puzzleData?.cols ?? difficulty.cols;
    const rows = puzzleData?.rows ?? difficulty.rows;
    
    // Calculate integer piece dimensions
    const pieceWidth = Math.floor(contentWidth / cols);
    const pieceHeight = Math.floor(contentHeight / rows);
    
    return {
      width: pieceWidth,
      height: pieceHeight
    };
  };

  const isPieceLocked = (piece) => {
    if (!piece || !puzzleData) return false;

    const pieceOnBoard = boardPieces.find((p) => p.id === piece.id);
    if (!pieceOnBoard) return false;

    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;

    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardW, boardH);
    const correctX = correctCol * pieceWidth;
    const correctY = correctRow * pieceHeight;
    const isCorrectCol = Math.abs((pieceOnBoard.boardX || 0) - correctX) <= POSITION_TOLERANCE;
    const isCorrectRow = Math.abs((pieceOnBoard.boardY || 0) - correctY) <= POSITION_TOLERANCE;

    return isCorrectCol && isCorrectRow;
  };

  const isPuzzleComplete = () => {
    if (!puzzleData || holderPieces.length > 0) return false;
    if (boardPieces.length !== puzzleData.pieces.length) return false;
    return boardPieces.every((piece) => isPieceLocked(piece));
  };

  const swapPieces = (piece1 = selectedPiece, piece2 = selectedPiece2) => {
    if (!piece1 || !piece2) return;
    if (isPieceLocked(piece1) || isPieceLocked(piece2)) return;

    const isBothOnBoard = boardPieces.some((p) => p.id === piece1.id) &&
      boardPieces.some((p) => p.id === piece2.id);
    if (!isBothOnBoard) return;

    setBoardPieces((prev) => {
      const p1 = prev.find((p) => p.id === piece1.id);
      const p2 = prev.find((p) => p.id === piece2.id);

      if (!p1 || !p2 || !p1.imageUri || !p2.imageUri) return prev;

      return prev.map((piece) => {
        if (piece.id === piece1.id) return { ...p1, boardX: p2.boardX, boardY: p2.boardY };
        if (piece.id === piece2.id) return { ...p2, boardX: p1.boardX, boardY: p1.boardY };
        return piece;
      });
    });

    clearSelection();
    setMoveCount((prev) => prev + 1);
  };

  const handlePieceSelect = (piece) => {
    if (!piece) return;

    const fullPiece = boardPieces.find((p) => p.id === piece.id) ||
      holderPieces.find((p) => p.id === piece.id) ||
      piece;

    if (!fullPiece?.imageUri || isPieceLocked(fullPiece)) return;

    const isPieceFromBoard = boardPieces.some((p) => p.id === fullPiece.id);
    const isSelectedFromBoard = selectedPiece ? boardPieces.some((p) => p.id === selectedPiece.id) : false;
    const isSelectedFromHolder = selectedPiece ? holderPieces.some((p) => p.id === selectedPiece.id) : false;

    if (isSelectedFromHolder) {
      if (fullPiece.id === selectedPiece.id) {
        setSelectedPiece(null);
        setSelectedPiece2(null);
        return;
      }
      if (!isPieceFromBoard) {
        setSelectedPiece(fullPiece);
        setSelectedPiece2(null);
        return;
      }
      return;
    }

    if (isSelectedFromBoard && !isPieceFromBoard) {
      setBoardPieces((prev) => prev.filter((p) => p.id !== selectedPiece.id));
      setHolderPieces((prev) => {
        if (prev.some((p) => p.id === selectedPiece.id)) return prev;
        const { boardX, boardY, ...pieceWithoutPosition } = selectedPiece;
        return restoreHolderOrder([...prev, pieceWithoutPosition]);
      });
      clearSelection();
      return;
    }

    if (fullPiece.id === selectedPiece?.id) {
      clearSelection();
      return;
    }

    if (fullPiece.id === selectedPiece2?.id) {
      setSelectedPiece2(null);
      return;
    }
    if (!selectedPiece) {
      setSelectedPiece(fullPiece);
      setSelectedPiece2(null);
    } else if (!selectedPiece2) {
      setSelectedPiece2(fullPiece);
      if (isSelectedFromBoard && isPieceFromBoard) {
        swapPieces(selectedPiece, fullPiece);
      }
    } else {
      setSelectedPiece(fullPiece);
      setSelectedPiece2(null);
    }
  };

  const restoreHolderOrder = (pieces) => {
    const piecesMap = new Map(pieces.map((p) => [p.id, p]));
    return originalHolderOrderRef.current
      .map((orderItem) => {
        const piece = piecesMap.get(orderItem.id);
        if (!piece) return null;
        const { boardX, boardY, ...pieceWithoutPosition } = piece;
        return pieceWithoutPosition;
      })
      .filter(Boolean);
  };

  const handleBoardTap = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardW, boardH);

    // Check if tap is on a piece - for locked pieces, use their grid position
    const tappedPiece = boardPieces.find((piece) => {
      let pieceX, pieceY;
      
      if (isPieceLocked(piece)) {
        // For locked pieces, use their correct grid position
        const correctRow = piece.correctRow ?? piece.row;
        const correctCol = piece.correctCol ?? piece.col;
        if (correctRow === undefined || correctCol === undefined) return false;
        pieceX = correctCol * pieceWidth;
        pieceY = correctRow * pieceHeight;
      } else {
        // For unlocked pieces, use their current board position
        pieceX = piece.boardX || 0;
        pieceY = piece.boardY || 0;
      }
      
      return locationX >= pieceX && locationX <= pieceX + pieceWidth &&
        locationY >= pieceY && locationY <= pieceY + pieceHeight;
    });

    if (tappedPiece) {
      if (isPieceLocked(tappedPiece)) {
        if (selectedPiece || selectedPiece2) {
          clearSelection();
        }
        return;
      }

      if (selectedPiece && selectedPiece2) {
        swapPieces();
        return;
      }

      if (selectedPiece && tappedPiece.id !== selectedPiece.id && tappedPiece.id !== selectedPiece2?.id) {
        const fullTappedPiece = boardPieces.find((p) => p.id === tappedPiece.id);
        if (fullTappedPiece?.imageUri) {
          setSelectedPiece2(fullTappedPiece);
        }
      }
      return;
    }

    if (!selectedPiece) return;

    const contentWidth = boardW - (BOARD_BORDER_WIDTH * 2);
    const contentHeight = boardH - (BOARD_BORDER_WIDTH * 2);
    const maxX = contentWidth - pieceWidth;
    const maxY = contentHeight - pieceHeight;
    
    let newBoardX = Math.max(0, Math.min(locationX - (pieceWidth / 2), maxX));
    let newBoardY = Math.max(0, Math.min(locationY - (pieceHeight / 2), maxY));

    const rows = puzzleData?.rows ?? difficulty.rows;
    const cols = puzzleData?.cols ?? difficulty.cols;

    const isCellOccupied = (cellX, cellY) => {
      return boardPieces.some((p) => {
        if (p.id === selectedPiece.id) return false;
        
        // For locked pieces, check their actual grid position (correctRow/correctCol)
        // This ensures we only block the actual cells that contain pieces, not the bounding box
        if (isPieceLocked(p)) {
          const correctRow = p.correctRow ?? p.row;
          const correctCol = p.correctCol ?? p.col;
          if (correctRow === undefined || correctCol === undefined) return false;
          const correctX = correctCol * pieceWidth;
          const correctY = correctRow * pieceHeight;
          // Check if this cell position matches the piece's grid position
          return Math.abs(cellX - correctX) < POSITION_TOLERANCE && 
                 Math.abs(cellY - correctY) < POSITION_TOLERANCE;
        }
        
        // For unlocked pieces, check their current board position
        const pX = p.boardX || 0;
        const pY = p.boardY || 0;
        return !(cellX + pieceWidth <= pX + POSITION_TOLERANCE ||
          cellX >= pX + pieceWidth - POSITION_TOLERANCE ||
          cellY + pieceHeight <= pY + POSITION_TOLERANCE ||
          cellY >= pY + pieceHeight - POSITION_TOLERANCE);
      });
    };

    const calculateOverlap = (cellX, cellY) => {
      const overlapWidth = Math.max(0, Math.min(newBoardX + pieceWidth, cellX + pieceWidth) - Math.max(newBoardX, cellX));
      const overlapHeight = Math.max(0, Math.min(newBoardY + pieceHeight, cellY + pieceHeight) - Math.max(newBoardY, cellY));
      return overlapWidth * overlapHeight;
    };

    let bestCell = null;
    let maxOverlap = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = col * pieceWidth;
        const cellY = row * pieceHeight;

        if (!isCellOccupied(cellX, cellY)) {
          const overlap = calculateOverlap(cellX, cellY);
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestCell = { x: cellX, y: cellY };
          }
        }
      }
    }

    if (bestCell && maxOverlap > 0) {
      newBoardX = bestCell.x;
      newBoardY = bestCell.y;
    }

    const isPieceOnBoard = boardPieces.some((p) => p.id === selectedPiece.id);

    if (isPieceOnBoard) {
      setBoardPieces((prev) => prev.map((p) =>
        p.id === selectedPiece.id ? { ...p, boardX: newBoardX, boardY: newBoardY } : p
      ));
    } else {
      if (!selectedPiece?.imageUri) return;

      setBoardPieces((prev) => [...prev, { ...selectedPiece, boardX: newBoardX, boardY: newBoardY }]);
      setHolderPieces((prev) => prev.filter((p) => p.id !== selectedPiece.id));
    }

    clearSelection();
    setMoveCount((prev) => prev + 1);
  };

  const handleOutsideTap = () => {
    if (selectedPiece || selectedPiece2) {
      clearSelection();
    }
  };

  const handleHolderTap = () => {
    if (!selectedPiece) return;

    const isPieceOnBoard = boardPieces.some((p) => p.id === selectedPiece.id);
    if (!isPieceOnBoard) return;

    setBoardPieces((prev) => prev.filter((p) => p.id !== selectedPiece.id));
    setHolderPieces((prev) => {
      if (prev.some((p) => p.id === selectedPiece.id)) return prev;

      const { boardX, boardY, ...pieceWithoutPosition } = selectedPiece;
      const allPieces = [...prev, pieceWithoutPosition];
      return restoreHolderOrder(allPieces);
    });

    setSelectedPiece(null);
    setSelectedPiece2(null);
  };

  const movePieceToPosition = (piece, x, y) => {
    if (boardPieces.some((p) => p.id === piece.id)) {
      setBoardPieces((prev) => prev.map((p) =>
        p.id === piece.id ? { ...p, boardX: x, boardY: y } : p
      ));
    } else {
      setHolderPieces((prev) => prev.filter((p) => p.id !== piece.id));
      setBoardPieces((prev) => [...prev, { ...piece, boardX: x, boardY: y }]);
    }
  };

  const handleHint = () => {
    if (!puzzleData) return;

    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardW, boardH);
    
    const pieceToHint = boardPieces.find((p) => !isPieceLocked(p)) || holderPieces[0];
    if (!pieceToHint) return;

    const correctRow = pieceToHint.correctRow ?? pieceToHint.row;
    const correctCol = pieceToHint.correctCol ?? pieceToHint.col;
    const correctX = correctCol * pieceWidth;
    const correctY = correctRow * pieceHeight;

    movePieceToPosition(pieceToHint, correctX, correctY);
    clearSelection();
    setMoveCount((prev) => prev + 1);
  };

  const handleTest = () => {
    if (!puzzleData) return;

    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: testPieceWidth, height: testPieceHeight } = getPieceDimensions(boardW, boardH);
    
    const allPieces = [...holderPieces, ...boardPieces];
    const piecesInCorrectPosition = allPieces.map((piece) => {
      const correctRow = piece.correctRow ?? piece.row;
      const correctCol = piece.correctCol ?? piece.col;
      return {
        ...piece,
        boardX: correctCol * testPieceWidth,
        boardY: correctRow * testPieceHeight,
      };
    });

    setBoardPieces(piecesInCorrectPosition);
    setHolderPieces([]);
    clearSelection();
  };

  const handleReset = () => {
    const allPieces = [...holderPieces, ...boardPieces];
    setHolderPieces(restoreHolderOrder(allPieces));
    setBoardPieces([]);
    clearSelection();
    setMoveCount(0);
    setTimer(0);
    setScrollResetKey((prev) => prev + 1);
  };

  const { width: boardWidth, height: boardHeight } = getBoardDimensions();
  const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardWidth, boardHeight);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Animated values for screen transitions
  // Home stays in place, Calendar slides from left, Settings slides from right
  const calendarTranslateX = useSharedValue(-SCREEN_WIDTH);
  const settingsTranslateX = useSharedValue(SCREEN_WIDTH);
  
  // Z-index for layering (Calendar and Settings slide over Home)
  const [calendarZIndex, setCalendarZIndex] = useState(1);
  const [settingsZIndex, setSettingsZIndex] = useState(1);
  const prevRouteRef = useRef('Home');
  
  // Handle screen transitions - using spring for smoother Android performance
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    const timingConfig = { duration: 280, easing: Easing.out(Easing.cubic) };
    
    if (currentRouteName === 'Calendar') {
      // Calendar slides in from left
      calendarTranslateX.value = withSpring(0, SCREEN_SPRING_CONFIG);
      // Settings slides out to right (if coming from Settings) - delayed
      if (prevRoute === 'Settings') {
        setCalendarZIndex(2);
        setSettingsZIndex(1);
        settingsTranslateX.value = withDelay(200, withTiming(SCREEN_WIDTH, timingConfig));
      } else {
        setCalendarZIndex(2);
        setSettingsZIndex(1);
      }
    } else if (currentRouteName === 'Home') {
      // Both Calendar and Settings slide out
      calendarTranslateX.value = withTiming(-SCREEN_WIDTH, timingConfig);
      settingsTranslateX.value = withTiming(SCREEN_WIDTH, timingConfig);
    } else if (currentRouteName === 'Settings') {
      // Settings slides in from right
      settingsTranslateX.value = withSpring(0, SCREEN_SPRING_CONFIG);
      // Calendar slides out to left (if coming from Calendar) - delayed
      if (prevRoute === 'Calendar') {
        setSettingsZIndex(2);
        setCalendarZIndex(1);
        calendarTranslateX.value = withDelay(200, withTiming(-SCREEN_WIDTH, timingConfig));
      } else {
        setSettingsZIndex(2);
        setCalendarZIndex(1);
      }
    }
    
    prevRouteRef.current = currentRouteName;
  }, [currentRouteName]);
  
  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: calendarTranslateX.value }],
  }));
  
  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: settingsTranslateX.value }],
  }));

  // Navigation helper for NavigationBar
  const navigate = useCallback((routeName) => {
    setCurrentRouteName(routeName);
  }, []);

  // Show auth screen if not authenticated and not skipped
  if (showAuthScreen && !isAuthenticated && !authLoading) {
    return (
      <>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <AuthScreen onSkip={handleSkipAuth} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <PaperBackground style={styles.background}>
        {showLoadingScreen && (
          <LoadingScreen 
            message={loadingMessage} 
            isVisible={isTransitioning}
            onExitComplete={handleLoadingExitComplete}
          />
        )}
        {!showLoadingScreen && (
          <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
          {showCompletionModal ? (
            <CompletionScreen
              timer={timer}
              moveCount={moveCount}
              difficulty={difficulty}
              originalImageUri={puzzleData?.originalImageUri}
              sourceImageUri={puzzleData?.sourceImageUri}
              sourceAssetId={puzzleData?.sourceAssetId}
              sourceFileName={puzzleData?.sourceFileName}
              sourceCreationDate={puzzleData?.sourceCreationDate}
              imageWidth={puzzleData ? pieceWidth * (puzzleData.cols ?? difficulty.cols) : 0}
              imageHeight={puzzleData ? pieceHeight * (puzzleData.rows ?? difficulty.rows) : 0}
              onPlayAgain={handlePlayAgain}
              onBackToMenu={handleBackToMenu}
              onCalendar={handleCalendar}
              onSettings={handleSettings}
            />
          ) : null}
          {!showGameScreen && !showCompletionModal && (
            <View style={styles.navigationWrapper}>
              <View style={styles.screensContainer}>
                {/* Home Screen - stays in place at bottom layer */}
                <View style={[styles.screenLayer, { zIndex: 0 }]}>
                  <View style={styles.screenContainer}>
                    <HomeScreen onNewGame={handleNewGame} />
                  </View>
                </View>
                
                {/* Calendar Screen - slides from left over Home */}
                <Animated.View 
                  style={[styles.screenLayer, calendarAnimatedStyle, { zIndex: calendarZIndex }]}
                  renderToHardwareTextureAndroid={Platform.OS === 'android'}
                >
                  <View style={styles.screenContainer}>
                    <GameProvider startPuzzleWithImage={startPuzzleWithImage}>
                      <CalendarScreen />
                    </GameProvider>
                  </View>
                </Animated.View>
                
                {/* Settings Screen - slides from right over Home */}
                <Animated.View 
                  style={[styles.screenLayer, settingsAnimatedStyle, { zIndex: settingsZIndex }]}
                  renderToHardwareTextureAndroid={Platform.OS === 'android'}
                >
                  <View style={styles.screenContainer}>
                    <SettingsScreen />
                  </View>
                </Animated.View>
              </View>
              <NavigationBar navigate={navigate} currentRouteName={currentRouteName} />
            </View>
          )}
          {showGameScreen && !showCompletionModal && (
            <TouchableWithoutFeedback onPress={handleOutsideTap}>
              <View style={styles.gameScreen}>
              {isGeneratingPuzzle && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>Generating puzzle...</Text>
                </View>
              )}

              <View style={styles.headerSection}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={resetGameState}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <GameStats timer={timer} moveCount={moveCount} />
              </View>

              <View style={styles.gameContainer}>
                <GameBoard
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
                  boardPieces={boardPieces}
                  pieceWidth={pieceWidth}
                  pieceHeight={pieceHeight}
                  selectedPieceId={selectedPiece?.id}
                  selectedPieceId2={selectedPiece2?.id}
                  onTap={handleBoardTap}
                  onPieceSelect={handlePieceSelect}
                  rows={puzzleData?.rows ?? difficulty.rows}
                  cols={puzzleData?.cols ?? difficulty.cols}
                  isComplete={isPuzzleComplete()}
                  originalImageUri={puzzleData?.originalImageUri}
                  onCompleteImageShown={() => setShowCompletionModal(true)}
                />
              </View>

              {puzzleData && (
                <View style={styles.holderContainer}>
                  <PuzzlePieceHolder
                    boardWidth={boardWidth}
                    pieces={holderPieces}
                    pieceWidth={pieceWidth}
                    pieceHeight={pieceHeight}
                    selectedPieceId={selectedPiece?.id}
                    selectedPieceId2={selectedPiece2?.id}
                    onPieceSelect={handlePieceSelect}
                    onHolderTap={handleHolderTap}
                    resetScrollKey={scrollResetKey}
                  />
                </View>
              )}

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleHint}
                >
                  <Ionicons name="bulb" size={18} color={theme.buttonText} />
                  <Text style={styles.actionButtonText}>Hint</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleTest}
                >
                  <Ionicons name="checkmark-circle" size={18} color={theme.buttonText} />
                  <Text style={styles.actionButtonText}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={18} color={theme.buttonText} />
                  <Text style={styles.actionButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
              </View>
            </TouchableWithoutFeedback>
          )}

        <DifficultyModal
          visible={showDifficultyModal}
          onSelect={handleDifficultySelected}
          onClose={() => setShowDifficultyModal(false)}
        />
          </Animated.View>
        )}
      </PaperBackground>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <CalendarProvider>
            <AppContent />
          </CalendarProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
