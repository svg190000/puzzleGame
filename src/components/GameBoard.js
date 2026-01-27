import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Confetti } from './Confetti';
import { SuccessBorderOverlay } from './SuccessBorderOverlay';

const BORDER_WIDTH = 3;
const POSITION_TOLERANCE = 2;
const ENTRANCE_SCALE_INITIAL = 0.5;
const ENTRANCE_OPACITY_INITIAL = 0;
const ENTRANCE_DURATION = 250;
const BORDER_COLOR_DURATION = 600;
const SUCCESS_BORDER_FADE_DURATION = 500; // Match overlay duration so border is green when trace disappears
const LOCK_ANIMATION_DELAY = 900;

const makeStyles = (theme) =>
  StyleSheet.create({
    board: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.shadow,
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
      backgroundColor: theme.surface,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    selectedBoardPiece: { shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
    selectedBoardPiece2: { shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
    boardPieceImage: { width: '100%', height: '100%' },
    gridLine: {
      position: 'absolute',
      backgroundColor: theme.gridLine,
      pointerEvents: 'none',
    },
    lockedPiece: { opacity: 0.95 },
    completeImageContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: BORDER_WIDTH,
      borderColor: theme.success,
    },
  });

const createEntranceAnimation = (scaleAnim, opacityAnim, callback) => {
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
        duration: ENTRANCE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(callback);
  });
};

const WAVE_PULSE_OPACITY_MIN = 0.82;
const WAVE_PULSE_DOWN_MS = 100;
const WAVE_PULSE_UP_MS = 150;

const AnimatedLockedPiece = ({ piece, pieceWidth, pieceHeight, isNewlyLocked, borderRadius, liftWaveActive, liftWaveDelayMs, theme }) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const wasNewlyLockedOnMount = useRef(isNewlyLocked).current;
  const scaleAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? ENTRANCE_SCALE_INITIAL : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyLockedOnMount ? ENTRANCE_OPACITY_INITIAL : 1)).current;
  const borderProgress = useRef(new Animated.Value(wasNewlyLockedOnMount ? 0 : 1)).current;
  const waveOpacity = useRef(new Animated.Value(1)).current;
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationRunId = useRef(piece.id);
  const hasAnimatedRef = useRef(!wasNewlyLockedOnMount); // Track if animation has run for this piece
  const borderAnimationRef = useRef(null);
  const waveRunRef = useRef(false);

  // Start border fade to green (runs in parallel with trace overlay)
  const startBorderFade = () => {
    borderAnimationRef.current = Animated.timing(borderProgress, {
      toValue: 1,
      duration: SUCCESS_BORDER_FADE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    borderAnimationRef.current.start(() => {
      borderAnimationRef.current = null;
    });
  };

  // Handle entrance and success trace animations for newly locked pieces
  useEffect(() => {
    if (wasNewlyLockedOnMount) {
      createEntranceAnimation(scaleAnim, opacityAnim, () => {
        // After entrance animation completes, start trace overlay and border fade together
        if (!hasAnimatedRef.current && piece.id === animationRunId.current) {
          setShowSuccessAnimation(true);
          setAnimationComplete(false);
          hasAnimatedRef.current = true;
          startBorderFade(); // Border fades to green in sync with trace so it's green when overlay disappears
        }
      });
    }
  }, []);

  // Handle pieces that become locked after mount (e.g., via hint)
  useEffect(() => {
    if (isNewlyLocked && !wasNewlyLockedOnMount && !hasAnimatedRef.current && piece.id === animationRunId.current) {
      // Reset border to white before starting trace animation
      borderProgress.setValue(0);
      // Piece is already settled, start success animation after a brief delay
      const timer = setTimeout(() => {
        if (piece.id === animationRunId.current) {
          setShowSuccessAnimation(true);
          setAnimationComplete(false);
          hasAnimatedRef.current = true;
          startBorderFade(); // Border fades to green in sync with trace
        }
      }, 100); // Small delay to ensure piece is visually settled
      
      return () => clearTimeout(timer);
    }
  }, [isNewlyLocked, piece.id]);

  // Reset animation state if piece ID changes (new piece)
  useEffect(() => {
    if (animationRunId.current !== piece.id) {
      animationRunId.current = piece.id;
      hasAnimatedRef.current = !isNewlyLocked;
      setShowSuccessAnimation(false);
      setAnimationComplete(false);
      waveRunRef.current = false;
      if (borderAnimationRef.current) {
        borderAnimationRef.current.stop();
        borderAnimationRef.current = null;
      }
    }
  }, [piece.id, isNewlyLocked]);

  // Completion wave: opacity pulse (dim → bright), staggered by (row+col). No scale/movement, so borders stay clean.
  useEffect(() => {
    if (!liftWaveActive) {
      waveRunRef.current = false;
      waveOpacity.setValue(1);
      return;
    }
    if (liftWaveDelayMs == null || waveRunRef.current) return;
    waveRunRef.current = true;
    waveOpacity.setValue(1);

    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(waveOpacity, {
          toValue: WAVE_PULSE_OPACITY_MIN,
          duration: WAVE_PULSE_DOWN_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(waveOpacity, {
          toValue: 1,
          duration: WAVE_PULSE_UP_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, liftWaveDelayMs);

    return () => clearTimeout(timer);
  }, [liftWaveActive, liftWaveDelayMs]);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    // Border fade was already started with the trace; just hide the overlay
    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, 50);
  };

  // Animate border color from white to success color
  const animatedBorderColor = borderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.white, theme.success],
  });

  const correctRow = piece.correctRow ?? piece.row;
  const correctCol = piece.correctCol ?? piece.col;
  const exactX = correctCol !== undefined ? Math.floor(correctCol * pieceWidth) : (piece.boardX || 0);
  const exactY = correctRow !== undefined ? Math.floor(correctRow * pieceHeight) : (piece.boardY || 0);

  // Use animated borderRadius prop (lockedPieceBorderRadius) so completion animation (6→0) is visible.
  // Overlay uses static 6 because it only shows during success trace, before completion.
  const overlayBorderRadius = 6;

  return (
    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
      <Animated.View
        style={[
          styles.boardPiece,
          styles.lockedPiece,
          {
            position: 'absolute',
            left: exactX,
            top: exactY,
            width: pieceWidth,
            height: pieceHeight,
            borderRadius,
            opacity: waveOpacity,
          },
        ]}
      >
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            borderRadius,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: piece.imageUri }}
            style={styles.boardPieceImage}
            resizeMode="cover"
          />
          {/* Final border (shows after animation or immediately if not newly locked) */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 2,
              borderColor: animatedBorderColor,
              borderRadius,
              pointerEvents: 'none',
            }}
          />
          {/* Success border animation overlay - rendered on top of border */}
          {showSuccessAnimation && (
            <SuccessBorderOverlay
              active={showSuccessAnimation && !animationComplete}
              width={pieceWidth}
              height={pieceHeight}
              borderRadius={overlayBorderRadius}
              onComplete={handleAnimationComplete}
              successColor={theme.success}
            />
          )}
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const AnimatedBoardPiece = ({ piece, pieceWidth, pieceHeight, borderStyle, isHighlighted, isSelected, onPieceSelect, isNewlyPlaced, wasSwapped, borderRadius, theme }) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const wasNewlyPlacedOnMount = useRef(isNewlyPlaced).current;
  const scaleAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? ENTRANCE_SCALE_INITIAL : 1)).current;
  const opacityAnim = useRef(new Animated.Value(wasNewlyPlacedOnMount ? ENTRANCE_OPACITY_INITIAL : 1)).current;

  useEffect(() => {
    if (wasNewlyPlacedOnMount) {
      createEntranceAnimation(scaleAnim, opacityAnim);
    }
  }, []);

  useEffect(() => {
    if (wasSwapped) {
      scaleAnim.setValue(ENTRANCE_SCALE_INITIAL);
      opacityAnim.setValue(ENTRANCE_OPACITY_INITIAL);
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
          borderRadius: borderRadius || 8,
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

export const GameBoard = ({ boardWidth, boardHeight, boardPieces = [], pieceWidth = 0, pieceHeight = 0, selectedPieceId, selectedPieceId2, onTap, onPieceSelect, rows = 0, cols = 0, isComplete = false, originalImageUri = null, onCompleteImageShown = null }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [swappedIds, setSwappedIds] = useState(new Set());
  const prevBoardPiecesRef = useRef([]);
  const knownPieceIdsRef = useRef(new Set());
  const lockedPieceIdsRef = useRef(new Set());
  const prevIsCompleteRef = useRef(false);
  
  const pieceBorderRadius = useRef(new Animated.Value(8)).current;
  const lockedPieceBorderRadius = useRef(new Animated.Value(6)).current;
  const piecesOpacity = useRef(new Animated.Value(1)).current;
  const completeImageOpacity = useRef(new Animated.Value(0)).current;
  const lockIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const gridOpacity = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompleteImage, setShowCompleteImage] = useState(false);
  const [hideGrid, setHideGrid] = useState(false);
  const [liftWaveActive, setLiftWaveActive] = useState(false);

  const checkCorrectPosition = (piece) => {
    if (!piece || pieceWidth === 0 || pieceHeight === 0) return false;
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;
    const expectedX = correctCol * pieceWidth;
    const expectedY = correctRow * pieceHeight;
    const actualX = piece.boardX || 0;
    const actualY = piece.boardY || 0;
    return (
      Math.abs(actualX - expectedX) <= POSITION_TOLERANCE &&
      Math.abs(actualY - expectedY) <= POSITION_TOLERANCE
    );
  };

  // Track piece state changes for animations
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
    if (checkCorrectPosition(piece) && !lockedPieceIdsRef.current.has(piece.id)) {
      newlyLockedIds.add(piece.id);
    }
  });

  useEffect(() => {
    const currentBoardIds = new Set(boardPieces.map(p => p.id));
    
    // Clean up removed pieces
    knownPieceIdsRef.current.forEach(id => {
      if (!currentBoardIds.has(id)) {
        knownPieceIdsRef.current.delete(id);
        lockedPieceIdsRef.current.delete(id);
      }
    });

    // Track new pieces and locked state
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
    if (isComplete && !prevIsCompleteRef.current) {
      const GRID_FADE_DURATION = 800;
      const CORNER_SQUARE_DURATION = 1000;
      const WAVE_STAGGER_MS = 45;
      const WAVE_PULSE_DOWN_MS = 100;
      const WAVE_PULSE_UP_MS = 150;
      const CONFETTI_START_DELAY = 400;
      const COMPLETE_IMAGE_START_DELAY = 500;
      const CONFETTI_DURATION = 3400;
      const MODAL_SHOW_DELAY = CONFETTI_START_DELAY + CONFETTI_DURATION;

      const runAfterCorners = () => {
        // 1. Corners just finished → start lift wave (top-left to bottom-right)
        const maxStagger = (rows + cols - 2) * WAVE_STAGGER_MS;
        const waveTotalMs = maxStagger + WAVE_PULSE_DOWN_MS + WAVE_PULSE_UP_MS;

        setLiftWaveActive(true);

        setTimeout(() => {
          setLiftWaveActive(false);
          // 2. Wave done → grid fade, then confetti & complete image
          Animated.timing(gridOpacity, {
            toValue: 0,
            duration: GRID_FADE_DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => setHideGrid(true));

          setTimeout(() => setShowConfetti(true), CONFETTI_START_DELAY);

          setTimeout(() => {
            setShowCompleteImage(true);
            const fadeAnimationConfig = {
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            };
            Animated.parallel([
              Animated.timing(piecesOpacity, { ...fadeAnimationConfig, toValue: 0 }),
              Animated.timing(completeImageOpacity, { ...fadeAnimationConfig, toValue: 1 }),
            ]).start();
          }, COMPLETE_IMAGE_START_DELAY);

          setTimeout(() => onCompleteImageShown?.(), MODAL_SHOW_DELAY);
        }, waveTotalMs);
      };

      setTimeout(() => {
        const cornerAnimationConfig = {
          duration: CORNER_SQUARE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        };

        Animated.parallel([
          Animated.timing(pieceBorderRadius, { ...cornerAnimationConfig, toValue: 0 }),
          Animated.timing(lockedPieceBorderRadius, { ...cornerAnimationConfig, toValue: 0 }),
          Animated.timing(lockIndicatorOpacity, { ...cornerAnimationConfig, toValue: 0 }),
        ]).start(runAfterCorners);
      }, LOCK_ANIMATION_DELAY);
    } else if (!isComplete && prevIsCompleteRef.current) {
      setShowConfetti(false);
      setShowCompleteImage(false);
      setHideGrid(false);
      setLiftWaveActive(false);
      pieceBorderRadius.setValue(8);
      lockedPieceBorderRadius.setValue(6);
      piecesOpacity.setValue(1);
      completeImageOpacity.setValue(0);
      lockIndicatorOpacity.setValue(1);
      gridOpacity.setValue(1);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete, rows, cols]);

  const renderGrid = () => {
    if (rows === 0 || cols === 0 || pieceWidth === 0 || pieceHeight === 0) return null;

    const gridWidth = cols * pieceWidth;
    const gridHeight = rows * pieceHeight;
    const gridLines = [];

    for (let col = 1; col < cols; col++) {
      gridLines.push(
        <Animated.View
          key={`v-${col}`}
          style={[styles.gridLine, {
            left: col * pieceWidth,
            top: 0,
            width: 1,
            height: gridHeight,
            opacity: gridOpacity,
          }]}
        />
      );
    }

    for (let row = 1; row < rows; row++) {
      gridLines.push(
        <Animated.View
          key={`h-${row}`}
          style={[styles.gridLine, {
            left: 0,
            top: row * pieceHeight,
            width: gridWidth,
            height: 1,
            opacity: gridOpacity,
          }]}
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
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          opacity: piecesOpacity,
        }}
        pointerEvents={isComplete ? 'none' : 'auto'}
      >
        {!hideGrid && renderGrid()}
        {boardPieces?.map((piece) => {
          if (!piece?.imageUri) return null;

          const isLocked = checkCorrectPosition(piece);
          const isSelected = !isLocked && selectedPieceId === piece.id;
          const isSelected2 = !isLocked && selectedPieceId2 === piece.id;

          const getBorderStyle = () => {
            if (isLocked) return { borderWidth: BORDER_WIDTH, borderColor: theme.success };
            if (isSelected) return { borderWidth: BORDER_WIDTH, borderColor: theme.accent };
            if (isSelected2) return { borderWidth: BORDER_WIDTH, borderColor: theme.pastelGreen };
            return { borderWidth: BORDER_WIDTH, borderColor: 'transparent' };
          };

          if (isLocked) {
            const cr = piece.correctRow ?? piece.row;
            const cc = piece.correctCol ?? piece.col;
            const staggerMs = (typeof cr === 'number' && typeof cc === 'number')
              ? (cr + cc) * 45
              : null;
            return (
              <AnimatedLockedPiece
                key={`locked-${piece.id}-${piece.boardX}-${piece.boardY}`}
                piece={piece}
                pieceWidth={pieceWidth}
                pieceHeight={pieceHeight}
                isNewlyLocked={newlyLockedIds.has(piece.id)}
                borderRadius={lockedPieceBorderRadius}
                liftWaveActive={liftWaveActive}
                liftWaveDelayMs={staggerMs}
                theme={theme}
              />
            );
          }

          return (
            <AnimatedBoardPiece
              key={`${piece.id}-${piece.boardX}-${piece.boardY}`}
              piece={piece}
              pieceWidth={pieceWidth}
              pieceHeight={pieceHeight}
              borderStyle={getBorderStyle()}
              isHighlighted={isSelected || isSelected2}
              isSelected={isSelected}
              onPieceSelect={onPieceSelect}
              isNewlyPlaced={newlyPlacedIds.has(piece.id)}
              wasSwapped={swappedIds.has(piece.id)}
              borderRadius={pieceBorderRadius}
              theme={theme}
            />
          );
        })}
      </Animated.View>
      {showCompleteImage && originalImageUri && (
        <Animated.Image
          source={{ uri: originalImageUri }}
          style={[
            styles.completeImageContainer,
            {
              width: cols * pieceWidth,
              height: rows * pieceHeight,
              left: 0,
              top: 0,
              opacity: completeImageOpacity,
            }
          ]}
          resizeMode="cover"
        />
      )}
      <Confetti 
        isActive={showConfetti} 
        boardWidth={boardWidth} 
        boardHeight={boardHeight}
      />
    </TouchableOpacity>
  );
};

