import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DifficultyModal } from './src/components/DifficultyModal';
import { PaperBackground } from './src/components/PaperBackground';
import { GameBoard } from './src/components/GameBoard';
import { PuzzlePieceHolder } from './src/components/PuzzlePieceHolder';
import { PuzzlePiece } from './src/components/PuzzlePiece';
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
  const boardLayoutRef = useRef(null);

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
  };

  // Check if a piece is in its correct position (locked)
  const isPieceLocked = (piece) => {
    if (!piece || !puzzleData) return false;
    
    const pieceOnBoard = boardPieces.find((p) => p.id === piece.id);
    if (!pieceOnBoard) return false; // Pieces not on board can't be locked
    
    const correctRow = piece.correctRow !== undefined ? piece.correctRow : piece.row;
    const correctCol = piece.correctCol !== undefined ? piece.correctCol : piece.col;
    
    if (correctRow === undefined || correctCol === undefined) return false;
    
    // Calculate piece dimensions to perfectly match grid cells
    const currentPieceWidth = boardWidth / puzzleData.cols;
    const currentPieceHeight = boardHeight / puzzleData.rows;
    
    // Check if piece is in correct position (with small tolerance for grid alignment)
    const tolerance = 2;
    const isCorrectCol = Math.abs((pieceOnBoard.boardX || 0) - (correctCol * currentPieceWidth)) <= tolerance;
    const isCorrectRow = Math.abs((pieceOnBoard.boardY || 0) - (correctRow * currentPieceHeight)) <= tolerance;
    
    return isCorrectCol && isCorrectRow;
  };

  const swapPieces = (piece1 = selectedPiece, piece2 = selectedPiece2) => {
    if (!piece1 || !piece2) return;
    
    // Don't swap if either piece is locked
    if (isPieceLocked(piece1) || isPieceLocked(piece2)) return;
    
    const isSelectedOnBoard = boardPieces.some((p) => p.id === piece1.id);
    const isSelected2OnBoard = boardPieces.some((p) => p.id === piece2.id);
    
    if (!isSelectedOnBoard || !isSelected2OnBoard) return;
    
    setBoardPieces((prev) => {
      const piece1FromPrev = prev.find((p) => p.id === piece1.id);
      const piece2FromPrev = prev.find((p) => p.id === piece2.id);
      
      if (!piece1FromPrev || !piece2FromPrev || !piece1FromPrev.imageUri || !piece2FromPrev.imageUri) {
        return prev;
      }
      
      const piece1X = piece1FromPrev.boardX;
      const piece1Y = piece1FromPrev.boardY;
      const piece2X = piece2FromPrev.boardX;
      const piece2Y = piece2FromPrev.boardY;
      
      return prev.map((piece) => {
        if (piece.id === piece1.id) {
          return {
            ...piece1FromPrev,
            boardX: piece2X,
            boardY: piece2Y,
          };
        } else if (piece.id === piece2.id) {
          return {
            ...piece2FromPrev,
            boardX: piece1X,
            boardY: piece1Y,
          };
        }
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
    
    if (!fullPiece || !fullPiece.imageUri) return;
    
    // Don't allow selection of locked pieces
    if (isPieceLocked(fullPiece)) return;
    
    // Determine if pieces are from holder or board
    const isPieceFromBoard = boardPieces.some((p) => p.id === fullPiece.id);
    const isPieceFromHolder = holderPieces.some((p) => p.id === fullPiece.id);
    
    // Check current selection status
    const isSelectedPieceFromBoard = selectedPiece ? boardPieces.some((p) => p.id === selectedPiece.id) : false;
    const isSelectedPieceFromHolder = selectedPiece ? holderPieces.some((p) => p.id === selectedPiece.id) : false;
    
    // Rule 1: If selectedPiece is from holder, cannot select another piece
    if (isSelectedPieceFromHolder) {
      // Allow deselection by clicking the same piece
      if (fullPiece.id === selectedPiece.id) {
        setSelectedPiece(null);
        setSelectedPiece2(null);
      }
      // Otherwise, ignore selection attempts
      return;
    }
    
    // Rule 2: If selectedPiece is from board, can only select another board piece
    if (isSelectedPieceFromBoard && !isPieceFromBoard) {
      // Trying to select a holder piece when a board piece is selected - ignore
      return;
    }
    
    if (selectedPiece && selectedPiece2) {
      const isSelectedOnBoard = boardPieces.some((p) => p.id === selectedPiece.id);
      const isSelected2OnBoard = boardPieces.some((p) => p.id === selectedPiece2.id);
      
      if (isSelectedOnBoard && isSelected2OnBoard) {
        swapPieces();
        return;
      }
    }
    
    if (!selectedPiece) {
      setSelectedPiece(fullPiece);
      setSelectedPiece2(null);
    } else if (fullPiece.id === selectedPiece.id) {
      setSelectedPiece(null);
      setSelectedPiece2(null);
    } else if (fullPiece.id === selectedPiece2?.id) {
      setSelectedPiece2(null);
    } else if (!selectedPiece2) {
      // Setting the second piece - check if both are board pieces and swap immediately
      const isSelectedPieceFromBoard = boardPieces.some((p) => p.id === selectedPiece.id);
      if (isSelectedPieceFromBoard && isPieceFromBoard) {
        // Both are board pieces - swap immediately using the pieces directly
        setSelectedPiece2(fullPiece);
        swapPieces(selectedPiece, fullPiece);
      } else {
        // Not both board pieces, just set the second piece normally
        setSelectedPiece2(fullPiece);
      }
    } else {
      setSelectedPiece(fullPiece);
      setSelectedPiece2(null);
    }
  };

  const handleBoardTap = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    
    // Calculate piece dimensions to perfectly match grid cells
    const currentPieceWidth = puzzleData ? boardWidth / puzzleData.cols : boardWidth / difficulty.cols;
    const currentPieceHeight = puzzleData ? boardHeight / puzzleData.rows : boardHeight / difficulty.rows;
    
    // Check if tap is on a locked piece first - prevents piece movement
    const tappedLockedPiece = boardPieces.find((piece) => {
      if (!isPieceLocked(piece)) return false;
      const pieceX = piece.boardX || 0;
      const pieceY = piece.boardY || 0;
      return locationX >= pieceX && locationX <= pieceX + currentPieceWidth &&
             locationY >= pieceY && locationY <= pieceY + currentPieceHeight;
    });
    
    if (tappedLockedPiece) {
      if (selectedPiece || selectedPiece2) {
        setSelectedPiece(null);
        setSelectedPiece2(null);
      }
      return;
    }
    
    // Check if tap is on any piece
    const tappedPiece = boardPieces.find((piece) => {
      const pieceX = piece.boardX || 0;
      const pieceY = piece.boardY || 0;
      return locationX >= pieceX && locationX <= pieceX + currentPieceWidth &&
             locationY >= pieceY && locationY <= pieceY + currentPieceHeight;
    });

    if (selectedPiece && selectedPiece2) {
      swapPieces();
      return;
    }

    if (tappedPiece) {
      if (selectedPiece && tappedPiece.id !== selectedPiece.id && tappedPiece.id !== selectedPiece2?.id) {
        const fullTappedPiece = boardPieces.find((p) => p.id === tappedPiece.id);
        if (fullTappedPiece && fullTappedPiece.imageUri) {
          setSelectedPiece2(fullTappedPiece);
        }
      }
      return;
    }

    if (!selectedPiece) {
      return;
    }

    // Calculate initial drop position (free placement)
    let newBoardX = Math.max(0, Math.min(locationX - (currentPieceWidth / 2), boardWidth - currentPieceWidth));
    let newBoardY = Math.max(0, Math.min(locationY - (currentPieceHeight / 2), boardHeight - currentPieceHeight));

    // Snap to grid cell that piece covers the most
    const rows = puzzleData ? puzzleData.rows : difficulty.rows;
    const cols = puzzleData ? puzzleData.cols : difficulty.cols;
    
    // Calculate piece bounding box at drop location
    const pieceLeft = newBoardX;
    const pieceTop = newBoardY;
    const pieceRight = pieceLeft + currentPieceWidth;
    const pieceBottom = pieceTop + currentPieceHeight;
    
    // Find the grid cell with maximum overlap
    let maxOverlapArea = 0;
    let bestGridCell = null;
    
    // Check all grid cells to find the one with most overlap
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = col * currentPieceWidth;
        const cellY = row * currentPieceHeight;
        const cellLeft = cellX;
        const cellTop = cellY;
        const cellRight = cellLeft + currentPieceWidth;
        const cellBottom = cellTop + currentPieceHeight;
        
        // Calculate overlap area (intersection of piece and grid cell)
        const overlapLeft = Math.max(pieceLeft, cellLeft);
        const overlapTop = Math.max(pieceTop, cellTop);
        const overlapRight = Math.min(pieceRight, cellRight);
        const overlapBottom = Math.min(pieceBottom, cellBottom);
        
        // Calculate overlap area
        const overlapWidth = Math.max(0, overlapRight - overlapLeft);
        const overlapHeight = Math.max(0, overlapBottom - overlapTop);
        const overlapArea = overlapWidth * overlapHeight;
        
        // Track the grid cell with maximum overlap
        if (overlapArea > maxOverlapArea) {
          maxOverlapArea = overlapArea;
          bestGridCell = { x: cellX, y: cellY, col, row };
        }
      }
    }
    
    // If we found a grid cell with overlap, snap to it
    if (bestGridCell && maxOverlapArea > 0) {
      // Check if this grid cell is available (not occupied by another piece)
      const isGridCellOccupied = boardPieces.some((p) => {
        if (p.id === selectedPiece.id) return false; // Don't check against self
        const pX = p.boardX || 0;
        const pY = p.boardY || 0;
        // Check if positions overlap (with small tolerance for grid alignment)
        const tolerance = 2;
        return !(bestGridCell.x + currentPieceWidth <= pX + tolerance || 
                 bestGridCell.x >= pX + currentPieceWidth - tolerance ||
                 bestGridCell.y + currentPieceHeight <= pY + tolerance ||
                 bestGridCell.y >= pY + currentPieceHeight - tolerance);
      });
      
      if (!isGridCellOccupied) {
        // Snap to the grid cell with most overlap
        newBoardX = bestGridCell.x;
        newBoardY = bestGridCell.y;
      } else {
        // Best cell is occupied - find nearest available cell with overlap
        let bestAvailableCell = null;
        let bestAvailableOverlap = 0;
        
        // Check all available grid cells and find the one with most overlap
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const cellX = col * currentPieceWidth;
            const cellY = row * currentPieceHeight;
            
            // Check if this cell is occupied
            const isOccupied = boardPieces.some((p) => {
              if (p.id === selectedPiece.id) return false;
              const pX = p.boardX || 0;
              const pY = p.boardY || 0;
              const tolerance = 2;
              return !(cellX + currentPieceWidth <= pX + tolerance || 
                       cellX >= pX + currentPieceWidth - tolerance ||
                       cellY + currentPieceHeight <= pY + tolerance ||
                       cellY >= pY + currentPieceHeight - tolerance);
            });
            
            if (!isOccupied) {
              // Calculate overlap with this cell
              const cellLeft = cellX;
              const cellTop = cellY;
              const cellRight = cellLeft + currentPieceWidth;
              const cellBottom = cellTop + currentPieceHeight;
              
              const overlapLeft = Math.max(pieceLeft, cellLeft);
              const overlapTop = Math.max(pieceTop, cellTop);
              const overlapRight = Math.min(pieceRight, cellRight);
              const overlapBottom = Math.min(pieceBottom, cellBottom);
              
              const overlapWidth = Math.max(0, overlapRight - overlapLeft);
              const overlapHeight = Math.max(0, overlapBottom - overlapTop);
              const overlapArea = overlapWidth * overlapHeight;
              
              if (overlapArea > bestAvailableOverlap) {
                bestAvailableOverlap = overlapArea;
                bestAvailableCell = { x: cellX, y: cellY };
              }
            }
          }
        }
        
        // Snap to best available cell if found
        if (bestAvailableCell && bestAvailableOverlap > 0) {
          newBoardX = bestAvailableCell.x;
          newBoardY = bestAvailableCell.y;
        }
      }
    }

    const isPieceOnBoard = boardPieces.some((p) => p.id === selectedPiece.id);

    if (isPieceOnBoard) {
      setBoardPieces((prev) => {
        const pieceToMove = prev.find((p) => p.id === selectedPiece.id);
        
        if (!pieceToMove || !pieceToMove.imageUri) {
          return prev;
        }
        
        return prev.map((piece) => {
          if (piece.id === selectedPiece.id) {
            return {
              ...pieceToMove,
              boardX: newBoardX,
              boardY: newBoardY,
            };
          }
          return piece;
        });
      });
    } else {
      if (!selectedPiece || !selectedPiece.imageUri) {
        return;
      }
      
      setBoardPieces((prev) => [...prev, {
        ...selectedPiece,
        boardX: newBoardX,
        boardY: newBoardY,
      }]);

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
    if (!selectedPiece) {
      return;
    }

    const isPieceOnBoard = boardPieces.some((p) => p.id === selectedPiece.id);
    
    if (isPieceOnBoard) {
      setBoardPieces((prev) => prev.filter((p) => p.id !== selectedPiece.id));
      setHolderPieces((prev) => {
        const alreadyInHolder = prev.some((p) => p.id === selectedPiece.id);
        if (alreadyInHolder) {
          return prev;
        }
        return [...prev, { ...selectedPiece }].sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.col - b.col;
        });
      });
    }
    
    setSelectedPiece(null);
    setSelectedPiece2(null);
  };

  const handleHint = () => {
    if (!puzzleData) return;
    
    // Calculate piece dimensions to perfectly match grid cells
    const currentPieceWidth = boardWidth / puzzleData.cols;
    const currentPieceHeight = boardHeight / puzzleData.rows;
    
    // Check for unlocked pieces on the board
    const unlockedPieces = boardPieces.filter((piece) => !isPieceLocked(piece));
    
    if (unlockedPieces.length > 0) {
      // Move one unlocked piece to its correct position
      const pieceToHint = unlockedPieces[0];
      const correctRow = pieceToHint.correctRow !== undefined ? pieceToHint.correctRow : pieceToHint.row;
      const correctCol = pieceToHint.correctCol !== undefined ? pieceToHint.correctCol : pieceToHint.col;
      
      const correctBoardX = correctCol * currentPieceWidth;
      const correctBoardY = correctRow * currentPieceHeight;
      
      setBoardPieces((prev) => {
        return prev.map((piece) => {
          if (piece.id === pieceToHint.id) {
            return {
              ...piece,
              boardX: correctBoardX,
              boardY: correctBoardY,
            };
          }
          return piece;
        });
      });
    } else if (holderPieces.length > 0) {
      // Move one piece from holder to its correct position on the board
      const pieceToHint = holderPieces[0];
      const correctRow = pieceToHint.correctRow !== undefined ? pieceToHint.correctRow : pieceToHint.row;
      const correctCol = pieceToHint.correctCol !== undefined ? pieceToHint.correctCol : pieceToHint.col;
      
      const correctBoardX = correctCol * currentPieceWidth;
      const correctBoardY = correctRow * currentPieceHeight;
      
      // Remove from holder and add to board
      setHolderPieces((prev) => prev.filter((p) => p.id !== pieceToHint.id));
      setBoardPieces((prev) => [...prev, {
        ...pieceToHint,
        boardX: correctBoardX,
        boardY: correctBoardY,
      }]);
    }
    
    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount((prev) => prev + 1);
  };

  const handleReset = () => {
    // Move all pieces from board back to holder
    setBoardPieces((prev) => {
      // Prepare pieces to move (remove boardX and boardY)
      const piecesToMove = prev.map((piece) => {
        const { boardX, boardY, ...pieceWithoutPosition } = piece;
        return pieceWithoutPosition;
      });
      
      // Update holder pieces
      setHolderPieces((currentHolder) => {
        const newHolderPieces = [...currentHolder];
        const existingIds = new Set(newHolderPieces.map((p) => p.id));
        
        piecesToMove.forEach((piece) => {
          if (!existingIds.has(piece.id)) {
            newHolderPieces.push(piece);
          }
        });
        
        // Shuffle pieces in holder
        return shuffleArray(newHolderPieces);
      });
      
      // Clear board
      return [];
    });
    
    setSelectedPiece(null);
    setSelectedPiece2(null);
    setMoveCount(0);
    setTimer(0);
    setScrollResetKey((prev) => prev + 1);
  };

  const handleBoardLayout = (layout) => {
    boardLayoutRef.current = layout;
  };

  const headerHeight = 100;
  const holderHeight = 150;
  const actionButtonsHeight = 70;
  const equalSpacing = 16; // Even spacing between all elements
  
  const availableHeight = SCREEN_HEIGHT - headerHeight - holderHeight - actionButtonsHeight - (equalSpacing * 3);
  const boardWidth = SCREEN_WIDTH - 40;
  const boardHeight = Math.max(availableHeight * 0.9, boardWidth * 0.8);
  
  // Calculate piece dimensions to perfectly fill the board grid
  // Grid cells must exactly divide the board dimensions
  let pieceWidth = 0;
  let pieceHeight = 0;
  
  if (puzzleData) {
    // Calculate exact grid cell dimensions that perfectly divide the board
    pieceWidth = boardWidth / puzzleData.cols;
    pieceHeight = boardHeight / puzzleData.rows;
  } else {
    pieceWidth = boardWidth / difficulty.cols;
    pieceHeight = boardHeight / difficulty.rows;
  }

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
                onLayout={handleBoardLayout}
                boardPieces={boardPieces}
                pieceWidth={pieceWidth}
                pieceHeight={pieceHeight}
                selectedPieceId={selectedPiece?.id}
                selectedPieceId2={selectedPiece2?.id}
                onTap={handleBoardTap}
                onPieceSelect={handlePieceSelect}
                rows={puzzleData ? puzzleData.rows : difficulty.rows}
                cols={puzzleData ? puzzleData.cols : difficulty.cols}
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
