import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DifficultyModal } from './src/components/DifficultyModal';
import { PaperBackground } from './src/components/PaperBackground';
import { GameBoard } from './src/components/GameBoard';
import { PuzzlePieceHolder } from './src/components/PuzzlePieceHolder';
import { GameStats } from './src/components/GameStats';
import { generatePuzzle, shuffleArray } from './src/utils/puzzleUtils';
import { COLORS } from './src/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
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
  const originalHolderOrderRef = useRef([]);

  useEffect(() => {
    if (showGameScreen) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimer(0);
    }
  }, [showGameScreen]);


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

  const handleDifficultySelected = async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setShowDifficultyModal(false);
    
    const imageUri = await pickImageFromGallery();
    if (!imageUri) {
      return;
    }

    setIsGeneratingPuzzle(true);
    try {
      const puzzle = await generatePuzzle(imageUri, selectedDifficulty.rows, selectedDifficulty.cols);
      const shuffledPieces = shuffleArray(puzzle.pieces);
      setPuzzleData(puzzle);
      setHolderPieces(shuffledPieces);
      originalHolderOrderRef.current = shuffledPieces.map((p, index) => ({ id: p.id, index }));
      setShowGameScreen(true);
      setMoveCount(0);
      setTimer(0);
      setScrollResetKey((prev) => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      console.error(error);
    } finally {
      setIsGeneratingPuzzle(false);
    }
  };

  const handleBackButton = () => {
    setShowGameScreen(false);
    setTimer(0);
    setMoveCount(0);
    setPuzzleData(null);
    setHolderPieces([]);
    setBoardPieces([]);
    setSelectedPiece(null);
    setSelectedPiece2(null);
    originalHolderOrderRef.current = [];
  };

  const getPieceDimensions = () => {
    if (!puzzleData) return { width: boardWidth / difficulty.cols, height: boardHeight / difficulty.rows };
    return { width: boardWidth / puzzleData.cols, height: boardHeight / puzzleData.rows };
  };

  const isPieceLocked = (piece) => {
    if (!piece || !puzzleData) return false;
    
    const pieceOnBoard = boardPieces.find((p) => p.id === piece.id);
    if (!pieceOnBoard) return false;
    
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;
    
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions();
    const tolerance = 2;
    const isCorrectCol = Math.abs((pieceOnBoard.boardX || 0) - (correctCol * pieceWidth)) <= tolerance;
    const isCorrectRow = Math.abs((pieceOnBoard.boardY || 0) - (correctRow * pieceHeight)) <= tolerance;
    
    return isCorrectCol && isCorrectRow;
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
    
    // Rule 1: If selected piece is from holder, cannot select another piece
    if (isSelectedFromHolder) {
      if (fullPiece.id === selectedPiece.id) {
        setSelectedPiece(null);
        setSelectedPiece2(null);
      }
      return;
    }
    
    // Rule 2: If selected piece is from board, can only select another board piece
    if (isSelectedFromBoard && !isPieceFromBoard) return;
    
    // Handle deselection
    if (fullPiece.id === selectedPiece?.id) {
      setSelectedPiece(null);
      setSelectedPiece2(null);
      return;
    }
    
    if (fullPiece.id === selectedPiece2?.id) {
      setSelectedPiece2(null);
      return;
    }
    
    // Handle selection
    if (!selectedPiece) {
      setSelectedPiece(fullPiece);
      setSelectedPiece2(null);
    } else if (!selectedPiece2) {
      // Setting the second piece - swap immediately if both are board pieces
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
    const { width: currentPieceWidth, height: currentPieceHeight } = getPieceDimensions();
    
    // Check if tap is on a piece
    const tappedPiece = boardPieces.find((piece) => {
      const pieceX = piece.boardX || 0;
      const pieceY = piece.boardY || 0;
      return locationX >= pieceX && locationX <= pieceX + currentPieceWidth &&
             locationY >= pieceY && locationY <= pieceY + currentPieceHeight;
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

    // Calculate initial drop position
    let newBoardX = Math.max(0, Math.min(locationX - (currentPieceWidth / 2), boardWidth - currentPieceWidth));
    let newBoardY = Math.max(0, Math.min(locationY - (currentPieceHeight / 2), boardHeight - currentPieceHeight));

    // Snap to grid cell with maximum overlap
    const rows = puzzleData?.rows ?? difficulty.rows;
    const cols = puzzleData?.cols ?? difficulty.cols;
    const tolerance = 2;
    
    const isCellOccupied = (cellX, cellY) => {
      return boardPieces.some((p) => {
        if (p.id === selectedPiece.id) return false;
        const pX = p.boardX || 0;
        const pY = p.boardY || 0;
        return !(cellX + currentPieceWidth <= pX + tolerance || 
                 cellX >= pX + currentPieceWidth - tolerance ||
                 cellY + currentPieceHeight <= pY + tolerance ||
                 cellY >= pY + currentPieceHeight - tolerance);
      });
    };
    
    const calculateOverlap = (cellX, cellY) => {
      const pieceRight = newBoardX + currentPieceWidth;
      const pieceBottom = newBoardY + currentPieceHeight;
      const cellRight = cellX + currentPieceWidth;
      const cellBottom = cellY + currentPieceHeight;
      
      const overlapWidth = Math.max(0, Math.min(pieceRight, cellRight) - Math.max(newBoardX, cellX));
      const overlapHeight = Math.max(0, Math.min(pieceBottom, cellBottom) - Math.max(newBoardY, cellY));
      return overlapWidth * overlapHeight;
    };
    
    // Find best grid cell
    let bestCell = null;
    let maxOverlap = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = col * currentPieceWidth;
        const cellY = row * currentPieceHeight;
        
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
    
    const { width: pieceWidth, height: pieceHeight } = getPieceDimensions();
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

  const handleReset = () => {
    setBoardPieces((prevBoardPieces) => {
      const allPieces = [...holderPieces, ...prevBoardPieces];
      setHolderPieces(restoreHolderOrder(allPieces));
      return [];
    });
    
    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount(0);
    setTimer(0);
    setScrollResetKey((prev) => prev + 1);
  };

  const headerHeight = 100;
  const holderHeight = 150;
  const actionButtonsHeight = 70;
  const equalSpacing = 16;
  
  const availableHeight = SCREEN_HEIGHT - headerHeight - holderHeight - actionButtonsHeight - (equalSpacing * 3);
  const boardWidth = SCREEN_WIDTH - 40;
  const boardHeight = Math.max(availableHeight * 0.9, boardWidth * 0.8);
  
  const { width: pieceWidth, height: pieceHeight } = getPieceDimensions();

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <PaperBackground style={styles.background}>
        {!showGameScreen ? (
          <View style={styles.scrollView}>
            <View style={styles.initialState}>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>Potti's Puzzles</Text>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.newGameButton} onPress={handleNewGame}>
                  <Text style={styles.newGameButtonText}>New Game</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
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
                onPress={handleBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.statsContainer}>
                <GameStats timer={timer} moveCount={moveCount} />
              </View>
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
              />
            </View>

            {puzzleData && (
              <View style={{ marginBottom: 16 }}>
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
      </PaperBackground>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    minHeight: 500,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 50,
    width: '100%',
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 50,
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  newGameButton: {
    backgroundColor: COLORS.pastelBlue,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 20,
    elevation: 3,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  newGameButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
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
  statsContainer: {},
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 0, // Important for flex to work
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
});
