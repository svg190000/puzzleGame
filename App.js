import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { NavigationBar } from './src/components/NavigationBar';
import { generatePuzzle, shuffleArray } from './src/utils/puzzleUtils';
import { COLORS } from './src/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Stack = createNativeStackNavigator();

export default function App() {
  const HEADER_HEIGHT = 100;
  const HOLDER_HEIGHT = 140;
  const ACTION_BUTTONS_HEIGHT = 70;
  const EQUAL_SPACING = 16;
  const HORIZONTAL_PADDING = 40;
  const BOARD_BORDER_WIDTH = 2;
  const MIN_LOADING_TIME = 3000;

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
  const contentOpacity = useSharedValue(1);
  const originalHolderOrderRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const navigationRef = useNavigationContainerRef();
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

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery.');
      console.error(error);
      return null;
    }
  };

  const clearGameState = () => {
    setTimer(0);
    setMoveCount(0);
    setPuzzleData(null);
    setHolderPieces([]);
    setBoardPieces([]);
    setSelectedPiece(null);
    setSelectedPiece2(null);
    originalHolderOrderRef.current = [];
  };

  const calculateBoardDimensions = (rows, cols) => {
    const availableHeight = SCREEN_HEIGHT - HEADER_HEIGHT - HOLDER_HEIGHT - ACTION_BUTTONS_HEIGHT - (EQUAL_SPACING * 3);
    const maxBoardWidth = SCREEN_WIDTH - HORIZONTAL_PADDING;
    const maxBoardHeight = Math.max(availableHeight * 0.9, maxBoardWidth * 0.8);
    const pieceWidth = Math.floor(maxBoardWidth / cols);
    const pieceHeight = Math.floor(maxBoardHeight / rows);
    return {
      width: pieceWidth * cols,
      height: pieceHeight * rows,
    };
  };

  const handleDifficultySelected = async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    
    const startTime = Date.now();
    const imageUri = await pickImageFromGallery();
    if (!imageUri) {
      return;
    }
    
    setShowDifficultyModal(false);
    contentOpacity.value = 0;
    setShowLoadingScreen(true);
    setIsTransitioning(true);
    setLoadingMessage('Preparing game...');

    setIsGeneratingPuzzle(true);
    setLoadingMessage('Generating puzzle...');
    try {
      const { width: targetBoardWidth, height: targetBoardHeight } = calculateBoardDimensions(
        selectedDifficulty.rows,
        selectedDifficulty.cols
      );
      
      const puzzle = await generatePuzzle(
        imageUri,
        selectedDifficulty.rows,
        selectedDifficulty.cols,
        targetBoardWidth,
        targetBoardHeight
      );
      const shuffledPieces = shuffleArray(puzzle.pieces);
      setPuzzleData(puzzle);
      setHolderPieces(shuffledPieces);
      originalHolderOrderRef.current = shuffledPieces.map((p, index) => ({ id: p.id, index }));
      
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      setShowGameScreen(true);
      setMoveCount(0);
      setTimer(0);
      setScrollResetKey((prev) => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      console.error(error);
    } finally {
      setIsGeneratingPuzzle(false);
      setIsTransitioning(false);
    }
  };

  const resetGameState = async () => {
    contentOpacity.value = 0;
    setShowLoadingScreen(true);
    setIsTransitioning(true);
    setLoadingMessage('Returning to menu...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setShowGameScreen(false);
    setShowCompletionModal(false);
    clearGameState();
    setIsTransitioning(false);
  };

  const handleLoadingExitComplete = () => {
    setTimeout(() => {
      setShowLoadingScreen(false);
      contentOpacity.value = withTiming(1, { duration: 300 });
    }, 50);
  };

  const handlePlayAgain = async () => {
    contentOpacity.value = 0;
    setShowLoadingScreen(true);
    setIsTransitioning(true);
    setLoadingMessage('Starting new game...');
    setShowCompletionModal(false);
    setShowGameScreen(false);
    clearGameState();
    setScrollResetKey((prev) => prev + 1);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsTransitioning(false);
    setTimeout(() => setShowDifficultyModal(true), 100);
  };

  const handleBackToMenu = resetGameState;

  const handleSettings = () => {
    // Settings functionality to be implemented
  };

  const handleBackButton = resetGameState;

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
    const POSITION_TOLERANCE = 2;
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

    setSelectedPiece(null);
    setSelectedPiece2(null);
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
      setSelectedPiece(null);
      setSelectedPiece2(null);
      return;
    }

    if (fullPiece.id === selectedPiece?.id) {
      setSelectedPiece(null);
      setSelectedPiece2(null);
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
      .filter((piece) => piece !== null);
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
          setSelectedPiece(null);
          setSelectedPiece2(null);
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
    const POSITION_TOLERANCE = 2;

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

    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount((prev) => prev + 1);
  };

  const handleOutsideTap = () => {
    if (selectedPiece || selectedPiece2) {
      setSelectedPiece(null);
      setSelectedPiece2(null);
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

  const handleHint = () => {
    if (!puzzleData) return;

    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardW, boardH);
    const unlockedPieces = boardPieces.filter((piece) => !isPieceLocked(piece));

    if (unlockedPieces.length > 0) {
      const pieceToHint = unlockedPieces[0];
      const correctRow = pieceToHint.correctRow ?? pieceToHint.row;
      const correctCol = pieceToHint.correctCol ?? pieceToHint.col;

      setBoardPieces((prev) => prev.map((piece) =>
        piece.id === pieceToHint.id
          ? { ...piece, boardX: correctCol * pieceWidth, boardY: correctRow * pieceHeight }
          : piece
      ));
    } else if (holderPieces.length > 0) {
      const pieceToHint = holderPieces[0];
      const correctRow = pieceToHint.correctRow ?? pieceToHint.row;
      const correctCol = pieceToHint.correctCol ?? pieceToHint.col;

      setHolderPieces((prev) => prev.filter((p) => p.id !== pieceToHint.id));
      setBoardPieces((prev) => [...prev, {
        ...pieceToHint,
        boardX: correctCol * pieceWidth,
        boardY: correctRow * pieceHeight,
      }]);
    }

    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount((prev) => prev + 1);
  };

  const handleTest = () => {
    if (!puzzleData) return;

    const { width: boardW, height: boardH } = getBoardDimensions();
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardW, boardH);
    
    const allPieces = [...holderPieces, ...boardPieces];
    const piecesInCorrectPosition = allPieces.map((piece) => {
      const correctRow = piece.correctRow ?? piece.row;
      const correctCol = piece.correctCol ?? piece.col;
      return {
        ...piece,
        boardX: correctCol * pieceWidth,
        boardY: correctRow * pieceHeight,
      };
    });

    setBoardPieces(piecesInCorrectPosition);
    setHolderPieces([]);
    setSelectedPiece(null);
    setSelectedPiece2(null);
  };

  const handleReset = () => {
    const allPieces = [...holderPieces, ...boardPieces];
    setHolderPieces(restoreHolderOrder(allPieces));
    setBoardPieces([]);
    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount(0);
    setTimer(0);
    setScrollResetKey((prev) => prev + 1);
  };

  const { width: boardWidth, height: boardHeight } = getBoardDimensions();
  const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(boardWidth, boardHeight);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Screen wrapper components (without NavigationBar - it's rendered separately)
  const HomeScreenWrapper = () => (
    <View style={styles.screenContainer}>
      <HomeScreen onNewGame={handleNewGame} />
    </View>
  );

  const CalendarScreenWrapper = () => (
    <View style={styles.screenContainer}>
      <CalendarScreen />
    </View>
  );

  const SettingsScreenWrapper = () => (
    <View style={styles.screenContainer}>
      <SettingsScreen />
    </View>
  );

  // Platform-specific animation configuration
  // Native stack uses platform defaults for optimal performance:
  // - iOS: Native slide animation (UINavigationController)
  // - Android: Native Fragment transitions (subtle fade/scale)
  const screenOptions = {
    headerShown: false,
    // Use platform defaults - native-stack provides optimal animations
    // iOS: slide from right (native)
    // Android: Fragment transition with fade/scale (native)
    animation: 'default',
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
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
              imageWidth={puzzleData ? pieceWidth * (puzzleData.cols ?? difficulty.cols) : 0}
              imageHeight={puzzleData ? pieceHeight * (puzzleData.rows ?? difficulty.rows) : 0}
              onPlayAgain={handlePlayAgain}
              onBackToMenu={handleBackToMenu}
              onSettings={handleSettings}
            />
          ) : null}
          {!showGameScreen && !showCompletionModal && (
            <View style={styles.navigationWrapper}>
              <NavigationContainer 
                ref={navigationRef}
                onReady={() => {
                  const route = navigationRef.getCurrentRoute();
                  if (route) setCurrentRouteName(route.name);
                }}
                onStateChange={() => {
                  const route = navigationRef.getCurrentRoute();
                  if (route) setCurrentRouteName(route.name);
                }}
              >
                <Stack.Navigator
                  initialRouteName="Home"
                  screenOptions={screenOptions}
                >
                  <Stack.Screen name="Calendar" component={CalendarScreenWrapper} />
                  <Stack.Screen name="Home" component={HomeScreenWrapper} />
                  <Stack.Screen name="Settings" component={SettingsScreenWrapper} />
                </Stack.Navigator>
              </NavigationContainer>
              {navigationRef.isReady() && (
                <NavigationBar navigation={navigationRef} currentRouteName={currentRouteName} />
              )}
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
                  <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
                  <Ionicons name="bulb" size={18} color={COLORS.buttonText} />
                  <Text style={styles.actionButtonText}>Hint</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleTest}
                >
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.buttonText} />
                  <Text style={styles.actionButtonText}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={18} color={COLORS.buttonText} />
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  gameScreen: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 0,
  },
  holderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
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
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
    flex: 0,
  },
  actionButtonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  screenContainer: {
    flex: 1,
    width: '100%',
  },
  navigationWrapper: {
    flex: 1,
    width: '100%',
  },
});
