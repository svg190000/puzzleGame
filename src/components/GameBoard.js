import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { COLORS } from '../constants/colors';
import { Confetti } from './Confetti';

const BORDER_WIDTH = 3;
const BOARD_BORDER_WIDTH = 2; // Must match borderWidth in board style
const POSITION_TOLERANCE = 2;

// Utility function to group adjacent locked pieces
const groupAdjacentLockedPieces = (lockedPieces, pieceWidth, pieceHeight, rows, cols) => {
  if (lockedPieces.length === 0) return [];

  // Create a grid map to quickly find pieces by their grid position
  const gridMap = new Map();
  lockedPieces.forEach(piece => {
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    const key = `${correctRow}-${correctCol}`;
    gridMap.set(key, piece);
  });

  // Find all adjacent pieces using union-find approach
  const groups = [];
  const visited = new Set();

  const findAdjacent = (piece, currentGroup) => {
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    const key = `${correctRow}-${correctCol}`;

    if (visited.has(key)) return;
    visited.add(key);
    currentGroup.push(piece);

    // Check all 4 directions
    const directions = [
      { row: -1, col: 0 }, // top
      { row: 1, col: 0 },  // bottom
      { row: 0, col: -1 },  // left
      { row: 0, col: 1 },   // right
    ];

    directions.forEach(dir => {
      const newRow = correctRow + dir.row;
      const newCol = correctCol + dir.col;
      const newKey = `${newRow}-${newCol}`;
      
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && gridMap.has(newKey)) {
        const adjacentPiece = gridMap.get(newKey);
        findAdjacent(adjacentPiece, currentGroup);
      }
    });
  };

  lockedPieces.forEach(piece => {
    const key = `${piece.correctRow ?? piece.row}-${piece.correctCol ?? piece.col}`;
    if (!visited.has(key)) {
      const group = [];
      findAdjacent(piece, group);
      if (group.length > 0) {
        groups.push(group);
      }
    }
  });

  return groups;
};

// Calculate the bounding box and determine which edges of each piece should have borders
const calculateMergedGroupBounds = (group, pieceWidth, pieceHeight) => {
  if (group.length === 0) return null;

  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  // Create a map of pieces by their grid position
  const pieceMap = new Map();
  group.forEach(piece => {
    const row = piece.correctRow ?? piece.row;
    const col = piece.correctCol ?? piece.col;
    const key = `${row}-${col}`;
    pieceMap.set(key, piece);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  });

  // Ensure all positions are exact integers - use floor to ensure consistent rounding
  // This ensures pieces align perfectly without gaps
  const left = Math.floor(minCol * pieceWidth);
  const top = Math.floor(minRow * pieceHeight);
  const width = Math.floor((maxCol - minCol + 1) * pieceWidth);
  const height = Math.floor((maxRow - minRow + 1) * pieceHeight);

  // For each piece, determine which edges should have borders (outer edges only)
  const piecesWithBorders = group.map(piece => {
    const row = piece.correctRow ?? piece.row;
    const col = piece.correctCol ?? piece.col;
    
    // Check if adjacent pieces exist in the group
    const hasTop = pieceMap.has(`${row - 1}-${col}`);
    const hasBottom = pieceMap.has(`${row + 1}-${col}`);
    const hasLeft = pieceMap.has(`${row}-${col - 1}`);
    const hasRight = pieceMap.has(`${row}-${col + 1}`);
    
    // Check if adjacent pieces have inner corners that affect this piece's borders
    // When an adjacent piece has an inner corner, this piece's border should stop to leave space for the connector
    // Top-left neighbor's bottom-right inner corner affects this piece's top border (left side)
    const topLeftNeighborHasInnerBottomRight = pieceMap.has(`${row - 1}-${col - 1}`) && 
      pieceMap.has(`${row - 1}-${col}`) && pieceMap.has(`${row}-${col - 1}`);
    // Top-right neighbor's bottom-left inner corner affects this piece's top border (right side)
    const topRightNeighborHasInnerBottomLeft = pieceMap.has(`${row - 1}-${col + 1}`) && 
      pieceMap.has(`${row - 1}-${col}`) && pieceMap.has(`${row}-${col + 1}`);
    // Bottom-left neighbor's top-right inner corner affects this piece's bottom border (left side)
    const bottomLeftNeighborHasInnerTopRight = pieceMap.has(`${row + 1}-${col - 1}`) && 
      pieceMap.has(`${row + 1}-${col}`) && pieceMap.has(`${row}-${col - 1}`);
    // Bottom-right neighbor's top-left inner corner affects this piece's bottom border (right side)
    const bottomRightNeighborHasInnerTopLeft = pieceMap.has(`${row + 1}-${col + 1}`) && 
      pieceMap.has(`${row + 1}-${col}`) && pieceMap.has(`${row}-${col + 1}`);
    
    // Left neighbor's top-right inner corner affects this piece's left border (top side)
    const leftNeighborHasInnerTopRight = hasLeft && pieceMap.has(`${row - 1}-${col - 1}`) && pieceMap.has(`${row}-${col - 1}`);
    // Left neighbor's bottom-right inner corner affects this piece's left border (bottom side)
    const leftNeighborHasInnerBottomRight = hasLeft && pieceMap.has(`${row + 1}-${col - 1}`) && pieceMap.has(`${row}-${col - 1}`);
    // Right neighbor's top-left inner corner affects this piece's right border (top side)
    const rightNeighborHasInnerTopLeft = hasRight && pieceMap.has(`${row - 1}-${col + 1}`) && pieceMap.has(`${row}-${col + 1}`);
    // Right neighbor's bottom-left inner corner affects this piece's right border (bottom side)
    const rightNeighborHasInnerBottomLeft = hasRight && pieceMap.has(`${row + 1}-${col + 1}`) && pieceMap.has(`${row}-${col + 1}`);
    // Top neighbor's bottom-left inner corner affects this piece's top border (left side)
    const topNeighborHasInnerBottomLeft = hasTop && pieceMap.has(`${row - 1}-${col - 1}`) && pieceMap.has(`${row - 1}-${col}`);
    // Top neighbor's bottom-right inner corner affects this piece's top border (right side)
    const topNeighborHasInnerBottomRight = hasTop && pieceMap.has(`${row - 1}-${col + 1}`) && pieceMap.has(`${row - 1}-${col}`);
    // Bottom neighbor's top-left inner corner affects this piece's bottom border (left side)
    const bottomNeighborHasInnerTopLeft = hasBottom && pieceMap.has(`${row + 1}-${col - 1}`) && pieceMap.has(`${row + 1}-${col}`);
    // Bottom neighbor's top-right inner corner affects this piece's bottom border (right side)
    const bottomNeighborHasInnerTopRight = hasBottom && pieceMap.has(`${row + 1}-${col + 1}`) && pieceMap.has(`${row + 1}-${col}`);
    
    // Determine which corners should be rounded (outer corners)
    const isTopLeftCorner = !hasTop && !hasLeft;
    const isTopRightCorner = !hasTop && !hasRight;
    const isBottomLeftCorner = !hasBottom && !hasLeft;
    const isBottomRightCorner = !hasBottom && !hasRight;
    
    // Detect inner (concave) corners on this piece
    // Inner corner occurs when a piece has neighbors on two adjacent sides BUT no diagonal neighbor
    // This creates a concave corner (pointing inward), not a convex corner (pointing outward)
    const hasTopLeftDiagonal = pieceMap.has(`${row - 1}-${col - 1}`);
    const hasTopRightDiagonal = pieceMap.has(`${row - 1}-${col + 1}`);
    const hasBottomLeftDiagonal = pieceMap.has(`${row + 1}-${col - 1}`);
    const hasBottomRightDiagonal = pieceMap.has(`${row + 1}-${col + 1}`);
    
    // Top-left inner: has top and left neighbors, but NO top-left diagonal neighbor (concave)
    const isTopLeftInner = hasTop && hasLeft && !hasTopLeftDiagonal;
    // Top-right inner: has top and right neighbors, but NO top-right diagonal neighbor (concave)
    const isTopRightInner = hasTop && hasRight && !hasTopRightDiagonal;
    // Bottom-left inner: has bottom and left neighbors, but NO bottom-left diagonal neighbor (concave)
    const isBottomLeftInner = hasBottom && hasLeft && !hasBottomLeftDiagonal;
    // Bottom-right inner: has bottom and right neighbors, but NO bottom-right diagonal neighbor (concave)
    const isBottomRightInner = hasBottom && hasRight && !hasBottomRightDiagonal;
    
    return {
      piece,
      borders: {
        top: !hasTop,
        bottom: !hasBottom,
        left: !hasLeft,
        right: !hasRight,
      },
      corners: {
        topLeft: isTopLeftCorner,
        topRight: isTopRightCorner,
        bottomLeft: isBottomLeftCorner,
        bottomRight: isBottomRightCorner,
      },
      innerCorners: {
        topLeft: isTopLeftInner,
        topRight: isTopRightInner,
        bottomLeft: isBottomLeftInner,
        bottomRight: isBottomRightInner,
      },
      // Track which adjacent pieces have inner corners that affect this piece's borders
      adjacentInnerCorners: {
        topLeft: topLeftNeighborHasInnerBottomRight,
        topRight: topRightNeighborHasInnerBottomLeft,
        bottomLeft: bottomLeftNeighborHasInnerTopRight,
        bottomRight: bottomRightNeighborHasInnerTopLeft,
        leftTop: leftNeighborHasInnerTopRight,
        leftBottom: leftNeighborHasInnerBottomRight,
        rightTop: rightNeighborHasInnerTopLeft,
        rightBottom: rightNeighborHasInnerBottomLeft,
        topLeftEdge: topNeighborHasInnerBottomLeft,
        topRightEdge: topNeighborHasInnerBottomRight,
        bottomLeftEdge: bottomNeighborHasInnerTopLeft,
        bottomRightEdge: bottomNeighborHasInnerTopRight,
      },
      row,
      col,
    };
  });

  // Determine which corners of the overall bounding box should be rounded
  const hasTopLeft = group.some(p => {
    const r = p.correctRow ?? p.row;
    const c = p.correctCol ?? p.col;
    return r === minRow && c === minCol;
  });
  const hasTopRight = group.some(p => {
    const r = p.correctRow ?? p.row;
    const c = p.correctCol ?? p.col;
    return r === minRow && c === maxCol;
  });
  const hasBottomLeft = group.some(p => {
    const r = p.correctRow ?? p.row;
    const c = p.correctCol ?? p.col;
    return r === maxRow && c === minCol;
  });
  const hasBottomRight = group.some(p => {
    const r = p.correctRow ?? p.row;
    const c = p.correctCol ?? p.col;
    return r === maxRow && c === maxCol;
  });

  return {
    left,
    top,
    width,
    height,
    corners: {
      topLeft: hasTopLeft,
      topRight: hasTopRight,
      bottomLeft: hasBottomLeft,
      bottomRight: hasBottomRight,
    },
    pieces: group,
    piecesWithBorders, // New: pieces with border information
  };
};

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

// Component to render a merged group of locked pieces
const MergedPieceGroup = ({ groupBounds, pieceWidth, pieceHeight, isNewlyLocked, borderRadius, lockIndicatorOpacity }) => {
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
          useNativeDriver: true,
        }).start();
      });
    }
  }, []);

  // Animate border color from white to success color
  const animatedBorderColor = borderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.success],
  });

  // Border radius value (will be used per-piece)
  const borderRadiusValue = borderRadius || 8;
  const isAnimated = typeof borderRadiusValue === 'object' && borderRadiusValue.__getValue;
  
  // Helper function to get border radius for a corner
  const getCornerRadius = (shouldRound) => {
    if (!shouldRound) return 0;
    if (isAnimated) {
      return borderRadiusValue;
    }
    return typeof borderRadiusValue === 'number' ? borderRadiusValue : 8;
  };

  return (
    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
      {/* Container for the merged group - no border, just positioning */}
      {/* Use pointerEvents='box-none' to allow touches to pass through empty areas */}
      <Animated.View
        style={{
          position: 'absolute',
          left: groupBounds.left,
          top: groupBounds.top,
          width: groupBounds.width,
          height: groupBounds.height,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
        pointerEvents="box-none"
      >
        {/* Render each piece with its image and composite borders */}
        {groupBounds.piecesWithBorders.map(({ piece, borders, corners, innerCorners, adjacentInnerCorners, row, col }) => {
          // Calculate exact integer positions - use floor to match groupBounds calculation
          // This ensures pieces align perfectly without gaps
          const absoluteX = Math.floor(col * pieceWidth);
          const absoluteY = Math.floor(row * pieceHeight);
          const relativeX = absoluteX - groupBounds.left;
          const relativeY = absoluteY - groupBounds.top;
          
          // Calculate border radius for this piece's corners
          // Convert animated values to static numbers for width/height properties
          const pieceTopLeftRadius = corners.topLeft ? (isAnimated ? 8 : (typeof borderRadiusValue === 'number' ? borderRadiusValue : 8)) : 0;
          const pieceTopRightRadius = corners.topRight ? (isAnimated ? 8 : (typeof borderRadiusValue === 'number' ? borderRadiusValue : 8)) : 0;
          const pieceBottomLeftRadius = corners.bottomLeft ? (isAnimated ? 8 : (typeof borderRadiusValue === 'number' ? borderRadiusValue : 8)) : 0;
          const pieceBottomRightRadius = corners.bottomRight ? (isAnimated ? 8 : (typeof borderRadiusValue === 'number' ? borderRadiusValue : 8)) : 0;
          
          // Get border radius value for inner corners (always static number)
          const innerCornerRadius = typeof borderRadiusValue === 'number' ? borderRadiusValue : 8;
          
          // Get animated border radius values for border radius properties only
          const animatedTopLeftRadius = getCornerRadius(corners.topLeft);
          const animatedTopRightRadius = getCornerRadius(corners.topRight);
          const animatedBottomLeftRadius = getCornerRadius(corners.bottomLeft);
          const animatedBottomRightRadius = getCornerRadius(corners.bottomRight);
          
          // Check if the merged group is composite (has inner corners) or simple rectangle
          const hasInnerCorners = groupBounds.piecesWithBorders.some(p => 
            p.innerCorners.topLeft || p.innerCorners.topRight || 
            p.innerCorners.bottomLeft || p.innerCorners.bottomRight
          );
          
          // Show lock indicator only on the piece at the top-right of the overall bounding box
          const minRow = Math.min(...groupBounds.pieces.map(p => p.correctRow ?? p.row));
          const maxCol = Math.max(...groupBounds.pieces.map(p => p.correctCol ?? p.col));
          const isTopRightPiece = groupBounds.corners.topRight && 
            row === minRow && col === maxCol;

          // Use exact pixel boundaries (no overlap) so assembled puzzle matches complete image size.
          // Pieces are cut on pixel boundaries in puzzleUtils (integer crop origins/sizes).
          return (
            <View
              key={piece.id}
              style={{
                position: 'absolute',
                left: relativeX,
                top: relativeY,
                width: pieceWidth,
                height: pieceHeight,
                overflow: 'hidden',
                backgroundColor: 'transparent',
                margin: 0,
                padding: 0,
                borderWidth: 0,
              }}
            >
              <Image
                source={{ uri: piece.imageUri }}
                style={[
                  styles.mergedPieceImage,
                  {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: pieceWidth,
                    height: pieceHeight,
                  },
                ]}
                resizeMode="cover"
              />
              
              {borders.top && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {borders.bottom && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {borders.left && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {borders.right && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              
              {corners.topLeft && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: pieceTopLeftRadius,
                    height: pieceTopLeftRadius,
                    borderTopLeftRadius: animatedTopLeftRadius,
                    borderTopWidth: BORDER_WIDTH,
                    borderLeftWidth: BORDER_WIDTH,
                    borderColor: animatedBorderColor,
                    borderRightWidth: 0,
                    borderBottomWidth: 0,
                  }}
                />
              )}
              {corners.topRight && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: pieceTopRightRadius,
                    height: pieceTopRightRadius,
                    borderTopRightRadius: animatedTopRightRadius,
                    borderTopWidth: BORDER_WIDTH,
                    borderRightWidth: BORDER_WIDTH,
                    borderColor: animatedBorderColor,
                    borderLeftWidth: 0,
                    borderBottomWidth: 0,
                  }}
                />
              )}
              {corners.bottomLeft && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: pieceBottomLeftRadius,
                    height: pieceBottomLeftRadius,
                    borderBottomLeftRadius: animatedBottomLeftRadius,
                    borderBottomWidth: BORDER_WIDTH,
                    borderLeftWidth: BORDER_WIDTH,
                    borderColor: animatedBorderColor,
                    borderRightWidth: 0,
                    borderTopWidth: 0,
                  }}
                />
              )}
              {corners.bottomRight && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: pieceBottomRightRadius,
                    height: pieceBottomRightRadius,
                    borderBottomRightRadius: animatedBottomRightRadius,
                    borderBottomWidth: BORDER_WIDTH,
                    borderRightWidth: BORDER_WIDTH,
                    borderColor: animatedBorderColor,
                    borderLeftWidth: 0,
                    borderTopWidth: 0,
                  }}
                />
              )}
              
              {hasInnerCorners && innerCorners.topLeft && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: BORDER_WIDTH,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {hasInnerCorners && innerCorners.topRight && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: BORDER_WIDTH,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {hasInnerCorners && innerCorners.bottomLeft && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: BORDER_WIDTH,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
              {hasInnerCorners && innerCorners.bottomRight && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: BORDER_WIDTH,
                    height: BORDER_WIDTH,
                    backgroundColor: animatedBorderColor,
                  }}
                />
              )}
            </View>
          );
        })}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const AnimatedLockedPiece = ({ piece, pieceWidth, pieceHeight, isNewlyLocked, borderRadius, lockIndicatorOpacity }) => {
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
          useNativeDriver: true,
        }).start();
      });
    }
  }, []);

  // Animate border color from white to success color
  const animatedBorderColor = borderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.success],
  });

  // Snap locked pieces to exact grid positions to prevent gaps
  const correctRow = piece.correctRow ?? piece.row;
  const correctCol = piece.correctCol ?? piece.col;
  const exactX = correctCol !== undefined ? Math.floor(correctCol * pieceWidth) : (piece.boardX || 0);
  const exactY = correctRow !== undefined ? Math.floor(correctRow * pieceHeight) : (piece.boardY || 0);

  return (
    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
      {/* Outer Animated.View for border color animation (non-native driver) */}
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
            borderWidth: BORDER_WIDTH,
            borderColor: animatedBorderColor,
            borderRadius: borderRadius || 8,
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
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const AnimatedBoardPiece = ({ piece, pieceWidth, pieceHeight, borderStyle, isHighlighted, isSelected, onPieceSelect, isNewlyPlaced, wasSwapped, borderRadius }) => {
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
  const [swappedIds, setSwappedIds] = useState(new Set());
  const prevBoardPiecesRef = useRef([]);
  const knownPieceIdsRef = useRef(new Set());
  const lockedPieceIdsRef = useRef(new Set());
  const prevIsCompleteRef = useRef(false);
  
  const piecesScale = useRef(new Animated.Value(1)).current;
  const pieceBorderRadius = useRef(new Animated.Value(8)).current;
  const piecesOpacity = useRef(new Animated.Value(1)).current;
  const completeImageOpacity = useRef(new Animated.Value(0)).current;
  const lockIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const gridOpacity = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompleteImage, setShowCompleteImage] = useState(false);
  const [hideGrid, setHideGrid] = useState(false);

  const checkCorrectPosition = (piece) => {
    if (!piece || pieceWidth === 0 || pieceHeight === 0) return false;
    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;
    if (correctRow === undefined || correctCol === undefined) return false;
    const isCorrectCol = Math.abs((piece.boardX || 0) - (correctCol * pieceWidth)) <= POSITION_TOLERANCE;
    const isCorrectRow = Math.abs((piece.boardY || 0) - (correctRow * pieceHeight)) <= POSITION_TOLERANCE;
    return isCorrectCol && isCorrectRow;
  };

  // Calculate merged groups of locked pieces
  const mergedGroups = useMemo(() => {
    if (pieceWidth === 0 || pieceHeight === 0 || rows === 0 || cols === 0) return [];
    
    const lockedPieces = boardPieces.filter(piece => checkCorrectPosition(piece));
    if (lockedPieces.length === 0) return [];

    const groups = groupAdjacentLockedPieces(lockedPieces, pieceWidth, pieceHeight, rows, cols);
    return groups.map(group => calculateMergedGroupBounds(group, pieceWidth, pieceHeight)).filter(bounds => bounds !== null);
  }, [boardPieces, pieceWidth, pieceHeight, rows, cols]);

  // Track which pieces are part of merged groups
  const piecesInMergedGroups = useMemo(() => {
    const pieceIds = new Set();
    mergedGroups.forEach(group => {
      group.pieces.forEach(piece => {
        pieceIds.add(piece.id);
      });
    });
    return pieceIds;
  }, [mergedGroups]);

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
    if (isComplete && !prevIsCompleteRef.current) {
      // Wait for piece lock-in animations to complete before starting completion sequence
      // Lock-in animation: entrance (250ms) + border color (600ms) = ~850ms
      const LOCK_ANIMATION_DELAY = 900;
      const FADE_DURATION = 700;
      const GRID_FADE_DELAY = 200;
      const CONFETTI_START_DELAY = 400;
      const COMPLETE_IMAGE_START_DELAY = 500;
      const CONFETTI_DURATION = 600 + 2800; // LAUNCH_DURATION + FALL_DURATION
      const MODAL_SHOW_DELAY = CONFETTI_START_DELAY + CONFETTI_DURATION;
      
      setTimeout(() => {
        // Square corners and fade out lock indicators simultaneously
        Animated.parallel([
          Animated.timing(pieceBorderRadius, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lockIndicatorOpacity, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Fade out grid lines
          Animated.timing(gridOpacity, {
            toValue: 0,
            duration: FADE_DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            setHideGrid(true);
          });

          // Start confetti during grid fade
          setTimeout(() => {
            setShowConfetti(true);
          }, CONFETTI_START_DELAY);

          // Fade in complete image and fade out pieces
          setTimeout(() => {
            setShowCompleteImage(true);
            Animated.parallel([
              Animated.timing(piecesOpacity, {
                toValue: 0,
                duration: 1000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(completeImageOpacity, {
                toValue: 1,
                duration: 1000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]).start();
          }, COMPLETE_IMAGE_START_DELAY);

          // Show modal after confetti finishes
          setTimeout(() => {
            if (onCompleteImageShown) {
              onCompleteImageShown();
            }
          }, MODAL_SHOW_DELAY);
        });
      }, LOCK_ANIMATION_DELAY);
    } else if (!isComplete && prevIsCompleteRef.current) {
      // Reset all animations when puzzle is reset
      setShowConfetti(false);
      setShowCompleteImage(false);
      setHideGrid(false);
      piecesScale.setValue(1);
      pieceBorderRadius.setValue(8);
      piecesOpacity.setValue(1);
      completeImageOpacity.setValue(0);
      lockIndicatorOpacity.setValue(1);
      gridOpacity.setValue(1);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete, lockIndicatorOpacity, gridOpacity, piecesOpacity, completeImageOpacity, pieceBorderRadius]);

  const renderGrid = (gridOpacity) => {
    if (rows === 0 || cols === 0 || pieceWidth === 0 || pieceHeight === 0) return null;

    const gridWidth = cols * pieceWidth;
    const gridHeight = rows * pieceHeight;
    const gridLines = [];

    for (let col = 1; col < cols; col++) {
      gridLines.push(
        <Animated.View
          key={`v-${col}`}
          style={[
            styles.gridLine,
            {
              left: col * pieceWidth,
              top: 0,
              width: 1,
              height: gridHeight,
              opacity: gridOpacity,
            }
          ]}
        />
      );
    }

    for (let row = 1; row < rows; row++) {
      gridLines.push(
        <Animated.View
          key={`h-${row}`}
          style={[
            styles.gridLine,
            {
              left: 0,
              top: row * pieceHeight,
              width: gridWidth,
              height: 1,
              opacity: gridOpacity,
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
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale: piecesScale }],
          opacity: piecesOpacity,
        }}
        pointerEvents={isComplete ? 'none' : 'auto'}
      >
        {!hideGrid && renderGrid(gridOpacity)}
        {/* Render merged groups first */}
        {mergedGroups.map((groupBounds, index) => {
          const isNewlyLocked = groupBounds.pieces.some(piece => newlyLockedIds.has(piece.id));
          return (
            <MergedPieceGroup
              key={`merged-${index}-${groupBounds.pieces.map(p => p.id).join('-')}`}
              groupBounds={groupBounds}
              pieceWidth={pieceWidth}
              pieceHeight={pieceHeight}
              isNewlyLocked={isNewlyLocked}
              borderRadius={pieceBorderRadius}
              lockIndicatorOpacity={lockIndicatorOpacity}
            />
          );
        })}
        {/* Render individual pieces (unlocked and locked pieces not in merged groups) */}
        {boardPieces && boardPieces.map((piece) => {
        if (!piece || !piece.imageUri) {
          return null;
        }

        const isLocked = checkCorrectPosition(piece);
        const isInMergedGroup = piecesInMergedGroups.has(piece.id);
        
        // Skip locked pieces that are part of merged groups
        if (isLocked && isInMergedGroup) {
          return null;
        }

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
              borderRadius={pieceBorderRadius}
              lockIndicatorOpacity={lockIndicatorOpacity}
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
            borderRadius={pieceBorderRadius}
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
  mergedPieceImage: {
    // Individual piece images within merged group
    // Ensure exact pixel rendering to prevent gaps
    backgroundColor: 'transparent',
    // Disable any potential sub-pixel rendering
    transform: [{ translateX: 0 }, { translateY: 0 }],
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
  },
});
