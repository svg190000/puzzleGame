import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { COLORS } from '../constants/colors';

const BORDER_WIDTH = 3;

// Animated locked piece with entrance animation and border color animation
const AnimatedLockedPiece = ({ piece, pieceWidth, pieceHeight, isNewlyLocked }) => {
  const wasNewlyLockedOnMount = useRef(isNewlyLocked).current;

  // Entrance animation (same as AnimatedBoardPiece) - uses native driver
  const scaleAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? 0.5 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? 0 : 1)).current;

  // Border color animation progress from 0 to 1 - cannot use native driver
  const borderProgress = useRef(new Animated.Value(wasNewlyLockedOnMount ? 0 : 1)).current;

  useEffect(() => {
    if (wasNewlyLockedOnMount) {
      // Entrance animation first, then border animation
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 45,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // After entrance animation completes, start border animation
          Animated.timing(borderProgress, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        });
      });
    }
  }, []);

  // Animate border color from white to success color
  const animatedBorderColor = borderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.success],
  });

  return (
    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
      {/* Outer Animated.View for border color animation (non-native driver) */}
      <Animated.View
        style={[
          styles.boardPiece,
          styles.lockedPiece,
          {
            position: 'absolute',
            left: piece.boardX || 0,
            top: piece.boardY || 0,
            width: pieceWidth,
            height: pieceHeight,
            borderWidth: BORDER_WIDTH,
            borderColor: animatedBorderColor,
          },
        ]}
      >
        {/* Inner Animated.View for scale/opacity animation (native driver) */}
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          <Image
            source={{ uri: piece.imageUri }}
            style={styles.boardPieceImage}
            resizeMode="cover"
          />
          <View style={styles.lockIndicator} />
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// Animated wrapper for pieces that were just placed or swapped
const AnimatedBoardPiece = ({ piece, pieceWidth, pieceHeight, borderStyle, isHighlighted, isSelected, onPieceSelect, isNewlyPlaced, wasSwapped }) => {
  // Capture initial isNewlyPlaced value on mount (won't change even if prop changes)
  const wasNewlyPlacedOnMount = useRef(isNewlyPlaced).current;

  // Start at smaller scale/hidden if newly placed, so there's no flash before animation
  const scaleAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? 0.5 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? 0 : 1)).current;

  // Run entrance animation on mount if this was a newly placed piece
  useEffect(() => {
    if (wasNewlyPlacedOnMount) {
      // Small delay to ensure the component is fully mounted
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 45,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, []); // Only run on mount

  // Handle swap animation separately - same as initial placement
  useEffect(() => {
    if (wasSwapped) {
      // Swapped piece - reset and animate with same effect as initial placement
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [wasSwapped, piece.boardX, piece.boardY]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(e) => {
        e.stopPropagation();
        if (onPieceSelect) {
          onPieceSelect(piece);
        }
      }}
      style={[
        styles.boardPiece,
        {
          position: 'absolute',
          left: piece.boardX || 0,
          top: piece.boardY || 0,
          width: pieceWidth,
          height: pieceHeight,
          ...borderStyle,
        },
        isHighlighted && (isSelected ? styles.selectedBoardPiece : styles.selectedBoardPiece2),
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Image
          key={`img-${piece.id}-${piece.boardX}-${piece.boardY}`}
          source={{ uri: piece.imageUri }}
          style={styles.boardPieceImage}
          resizeMode="cover"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const GameBoard = ({ boardWidth, boardHeight, boardPieces = [], pieceWidth = 0, pieceHeight = 0, selectedPieceId, selectedPieceId2, onTap, onPieceSelect, rows = 0, cols = 0 }) => {
  const POSITION_TOLERANCE = 2;
  const [swappedIds, setSwappedIds] = useState(new Set());
  const prevBoardPiecesRef = useRef([]);
  const knownPieceIdsRef = useRef(new Set());
  const lockedPieceIdsRef = useRef(new Set()); // Track pieces that have been locked

  // Helper to check if piece is in correct position
  const checkCorrectPosition = (piece) => {
    if (!piece || pieceWidth === 0 || pieceHeight === 0) return false;
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;
    const isCorrectCol = Math.abs((piece.boardX || 0) - (correctCol * pieceWidth)) <= POSITION_TOLERANCE;
    const isCorrectRow = Math.abs((piece.boardY || 0) - (correctRow * pieceHeight)) <= POSITION_TOLERANCE;
    return isCorrectCol && isCorrectRow;
  };

  // Synchronously detect new and swapped pieces during render
  const newlyPlacedIds = new Set();
  const newlyLockedIds = new Set();
  const currentSwapped = [];

  const prevPiecesMap = new Map(prevBoardPiecesRef.current.map(p => [p.id, p]));

  boardPieces.forEach(piece => {
    // Check if this is a brand new piece we've never seen
    if (!knownPieceIdsRef.current.has(piece.id)) {
      newlyPlacedIds.add(piece.id);
    }

    // Check for position changes (swaps)
    const prevPiece = prevPiecesMap.get(piece.id);
    if (prevPiece && (prevPiece.boardX !== piece.boardX || prevPiece.boardY !== piece.boardY)) {
      currentSwapped.push(piece.id);
    }

    // Check if piece just became locked (correct position)
    const isNowLocked = checkCorrectPosition(piece);
    if (isNowLocked && !lockedPieceIdsRef.current.has(piece.id)) {
      newlyLockedIds.add(piece.id);
    }
  });

  // Update known pieces - sync with current board pieces
  // Remove pieces that are no longer on the board (moved back to holder or reset)
  useEffect(() => {
    const currentBoardIds = new Set(boardPieces.map(p => p.id));

    // Remove IDs that are no longer on the board
    knownPieceIdsRef.current.forEach(id => {
      if (!currentBoardIds.has(id)) {
        knownPieceIdsRef.current.delete(id);
        lockedPieceIdsRef.current.delete(id); // Also remove from locked tracking
      }
    });

    // Add new pieces and update locked status
    boardPieces.forEach(piece => {
      knownPieceIdsRef.current.add(piece.id);

      // Track locked pieces
      const isLocked = checkCorrectPosition(piece);
      if (isLocked) {
        lockedPieceIdsRef.current.add(piece.id);
      }
    });

    prevBoardPiecesRef.current = boardPieces;
  }, [boardPieces, pieceWidth, pieceHeight]);

  // Handle swapped pieces state
  useEffect(() => {
    if (currentSwapped.length > 0) {
      setSwappedIds(new Set(currentSwapped));

      const timer = setTimeout(() => {
        setSwappedIds(new Set());
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [boardPieces]);

  const renderGrid = () => {
    if (rows === 0 || cols === 0 || pieceWidth === 0 || pieceHeight === 0) return null;

    const gridLines = [];

    // Calculate the actual grid dimensions (excluding outer border lines)
    const gridWidth = cols * pieceWidth;
    const gridHeight = rows * pieceHeight;

    // Only draw interior vertical lines (skip first and last)
    for (let col = 1; col < cols; col++) {
      const x = col * pieceWidth;
      gridLines.push(
        <View
          key={`v-${col}`}
          style={[
            styles.gridLine,
            {
              left: x,
              top: 0,
              width: 1,
              height: gridHeight,
            }
          ]}
        />
      );
    }

    // Only draw interior horizontal lines (skip first and last)
    for (let row = 1; row < rows; row++) {
      const y = row * pieceHeight;
      gridLines.push(
        <View
          key={`h-${row}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: y,
              width: gridWidth,
              height: 1,
            }
          ]}
        />
      );
    }

    return gridLines;
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onTap}
      style={[
        styles.board,
        {
          width: boardWidth,
          height: boardHeight,
        }
      ]}
    >
      {renderGrid()}
      {boardPieces && boardPieces.map((piece) => {
        if (!piece || !piece.imageUri) {
          return null;
        }

        const isLocked = checkCorrectPosition(piece);
        const isSelected = !isLocked && selectedPieceId === piece.id;
        const isSelected2 = !isLocked && selectedPieceId2 === piece.id;
        const isHighlighted = isSelected || isSelected2;

        // Always reserve 3px border space to prevent layout shifts
        const borderStyle = isLocked
          ? { borderWidth: 3, borderColor: COLORS.success }
          : isSelected
            ? { borderWidth: 3, borderColor: COLORS.accent }
            : isSelected2
              ? { borderWidth: 3, borderColor: COLORS.pastelGreen }
              : { borderWidth: 3, borderColor: 'transparent' };

        if (isLocked) {
          return (
            <AnimatedLockedPiece
              key={`locked-${piece.id}-${piece.boardX}-${piece.boardY}`}
              piece={piece}
              pieceWidth={pieceWidth}
              pieceHeight={pieceHeight}
              isNewlyLocked={newlyLockedIds.has(piece.id)}
            />
          );
        }

        return (
          <AnimatedBoardPiece
            key={`${piece.id}-${piece.boardX}-${piece.boardY}`}
            piece={piece}
            pieceWidth={pieceWidth}
            pieceHeight={pieceHeight}
            borderStyle={borderStyle}
            isHighlighted={isHighlighted}
            isSelected={isSelected}
            onPieceSelect={onPieceSelect}
            isNewlyPlaced={newlyPlacedIds.has(piece.id)}
            wasSwapped={swappedIds.has(piece.id)}
          />
        );
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  boardPiece: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10, // Ensure pieces render above grid
  },
  selectedBoardPiece: {
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedBoardPiece2: {
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  boardPieceImage: {
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(184, 169, 217, 0.4)', // Light purple with transparency
    pointerEvents: 'none', // Allow taps to pass through
  },
  lockedPiece: {
    opacity: 0.95,
  },
  lockIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    borderWidth: 1,
    borderColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
