import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { COLORS } from '../constants/colors';
import { Confetti } from './Confetti';

const BORDER_WIDTH = 3;
const BOARD_BORDER_WIDTH = 2; // Must match borderWidth in board style
const POSITION_TOLERANCE = 2;

// Shared animation configuration
const ENTRANCE_ANIMATION_CONFIG = {
  scale: {
    spring: { friction: 5, tension: 45, useNativeDriver: true },
    initialValue: 0.5,
    targetValue: 1,
  },
  opacity: {
    timing: { duration: 250, useNativeDriver: true },
    initialValue: 0,
    targetValue: 1,
  },
};

const createEntranceAnimation = (scaleAnim, opacityAnim, callback) => {
  requestAnimationFrame(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: ENTRANCE_ANIMATION_CONFIG.scale.targetValue,
        ...ENTRANCE_ANIMATION_CONFIG.scale.spring,
      }),
      Animated.timing(opacityAnim, {
        toValue: ENTRANCE_ANIMATION_CONFIG.opacity.targetValue,
        ...ENTRANCE_ANIMATION_CONFIG.opacity.timing,
      }),
    ]).start(callback);
  });
};

const AnimatedLockedPiece = ({ piece, pieceWidth, pieceHeight, isNewlyLocked }) => {
  const wasNewlyLockedOnMount = useRef(isNewlyLocked).current;
  const scaleAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? ENTRANCE_ANIMATION_CONFIG.scale.initialValue : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? ENTRANCE_ANIMATION_CONFIG.opacity.initialValue : 1)).current;
  const borderProgress = useRef(new Animated.Value(wasNewlyLockedOnMount ? 0 : 1)).current;

  useEffect(() => {
    if (wasNewlyLockedOnMount) {
      createEntranceAnimation(scaleAnim, opacityAnim, () => {
        Animated.timing(borderProgress, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
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

const AnimatedBoardPiece = ({ piece, pieceWidth, pieceHeight, borderStyle, isHighlighted, isSelected, onPieceSelect, isNewlyPlaced, wasSwapped }) => {
  const wasNewlyPlacedOnMount = useRef(isNewlyPlaced).current;
  const scaleAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? ENTRANCE_ANIMATION_CONFIG.scale.initialValue : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? ENTRANCE_ANIMATION_CONFIG.opacity.initialValue : 1)).current;

  useEffect(() => {
    if (wasNewlyPlacedOnMount) {
      createEntranceAnimation(scaleAnim, opacityAnim);
    }
  }, []);

  useEffect(() => {
    if (wasSwapped) {
      scaleAnim.setValue(ENTRANCE_ANIMATION_CONFIG.scale.initialValue);
      opacityAnim.setValue(ENTRANCE_ANIMATION_CONFIG.opacity.initialValue);
      createEntranceAnimation(scaleAnim, opacityAnim);
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

export const GameBoard = ({ boardWidth, boardHeight, boardPieces = [], pieceWidth = 0, pieceHeight = 0, selectedPieceId, selectedPieceId2, onTap, onPieceSelect, rows = 0, cols = 0, isComplete = false, originalImageUri = null }) => {
  const [swappedIds, setSwappedIds] = useState(new Set());
  const prevBoardPiecesRef = useRef([]);
  const knownPieceIdsRef = useRef(new Set());
  const lockedPieceIdsRef = useRef(new Set());
  const prevIsCompleteRef = useRef(false);
  
  const piecesScale = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  const checkCorrectPosition = (piece) => {
    if (!piece || pieceWidth === 0 || pieceHeight === 0) return false;
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;
    const isCorrectCol = Math.abs((piece.boardX || 0) - (correctCol * pieceWidth)) <= POSITION_TOLERANCE;
    const isCorrectRow = Math.abs((piece.boardY || 0) - (correctRow * pieceHeight)) <= POSITION_TOLERANCE;
    return isCorrectCol && isCorrectRow;
  };

  const prevPiecesMap = new Map(prevBoardPiecesRef.current.map(p => [p.id, p]));
  const newlyPlacedIds = new Set();
  const newlyLockedIds = new Set();
  const currentSwapped = [];

  boardPieces.forEach(piece => {
    if (!knownPieceIdsRef.current.has(piece.id)) {
      newlyPlacedIds.add(piece.id);
    }

    const prevPiece = prevPiecesMap.get(piece.id);
    if (prevPiece && (prevPiece.boardX !== piece.boardX || prevPiece.boardY !== piece.boardY)) {
      currentSwapped.push(piece.id);
    }

    const isNowLocked = checkCorrectPosition(piece);
    if (isNowLocked && !lockedPieceIdsRef.current.has(piece.id)) {
      newlyLockedIds.add(piece.id);
    }
  });

  useEffect(() => {
    const currentBoardIds = new Set(boardPieces.map(p => p.id));

    knownPieceIdsRef.current.forEach(id => {
      if (!currentBoardIds.has(id)) {
        knownPieceIdsRef.current.delete(id);
        lockedPieceIdsRef.current.delete(id);
      }
    });

    boardPieces.forEach(piece => {
      knownPieceIdsRef.current.add(piece.id);
      if (checkCorrectPosition(piece)) {
        lockedPieceIdsRef.current.add(piece.id);
      }
    });

    prevBoardPiecesRef.current = boardPieces;
  }, [boardPieces, pieceWidth, pieceHeight]);

  useEffect(() => {
    if (currentSwapped.length > 0) {
      setSwappedIds(new Set(currentSwapped));
      const timer = setTimeout(() => setSwappedIds(new Set()), 400);
      return () => clearTimeout(timer);
    }
  }, [boardPieces]);


  useEffect(() => {
    let timeout1;

    if (isComplete && !prevIsCompleteRef.current) {
      timeout1 = setTimeout(() => {
        setShowConfetti(true);
      }, 1000);
    } else if (!isComplete && prevIsCompleteRef.current) {
      setShowConfetti(false);
      piecesScale.setValue(1);
    }
    prevIsCompleteRef.current = isComplete;

    return () => {
      if (timeout1) clearTimeout(timeout1);
    };
  }, [isComplete]);

  const renderGrid = () => {
    if (rows === 0 || cols === 0 || pieceWidth === 0 || pieceHeight === 0) return null;

    const gridWidth = cols * pieceWidth;
    const gridHeight = rows * pieceHeight;
    const gridLines = [];

    for (let col = 1; col < cols; col++) {
      gridLines.push(
        <View
          key={`v-${col}`}
          style={[
            styles.gridLine,
            {
              left: col * pieceWidth,
              top: 0,
              width: 1,
              height: gridHeight,
            }
          ]}
        />
      );
    }

    for (let row = 1; row < rows; row++) {
      gridLines.push(
        <View
          key={`h-${row}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: row * pieceHeight,
              width: gridWidth,
              height: 1,
            }
          ]}
        />
      );
    }

    return gridLines;
  };

  const contentWidth = boardWidth - (BOARD_BORDER_WIDTH * 2);
  const contentHeight = boardHeight - (BOARD_BORDER_WIDTH * 2);

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
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale: piecesScale }],
        }}
        pointerEvents={isComplete ? 'none' : 'auto'}
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

        const borderStyle = isLocked
          ? { borderWidth: BORDER_WIDTH, borderColor: COLORS.success }
          : isSelected
            ? { borderWidth: BORDER_WIDTH, borderColor: COLORS.accent }
            : isSelected2
              ? { borderWidth: BORDER_WIDTH, borderColor: COLORS.pastelGreen }
              : { borderWidth: BORDER_WIDTH, borderColor: 'transparent' };

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
      </Animated.View>
      <Confetti 
        isActive={showConfetti} 
        boardWidth={boardWidth} 
        boardHeight={boardHeight}
      />
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
  completeImageContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: BORDER_WIDTH,
    borderColor: COLORS.success,
    backgroundColor: COLORS.white,
  },
  completeImage: {
    width: '100%',
    height: '100%',
  },
});
