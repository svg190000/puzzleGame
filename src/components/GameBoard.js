import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { COLORS } from '../constants/colors';

export const GameBoard = ({ boardWidth, boardHeight, boardPieces = [], pieceWidth = 0, pieceHeight = 0, selectedPieceId, selectedPieceId2, onTap, onPieceSelect, rows = 0, cols = 0 }) => {
  const POSITION_TOLERANCE = 2;

  const isPieceInCorrectPosition = (piece) => {
    if (!piece || pieceWidth === 0 || pieceHeight === 0) return false;

    const correctRow = piece.correctRow ?? piece.row;
    const correctCol = piece.correctCol ?? piece.col;

    if (correctRow === undefined || correctCol === undefined) return false;

    const isCorrectCol = Math.abs((piece.boardX || 0) - (correctCol * pieceWidth)) <= POSITION_TOLERANCE;
    const isCorrectRow = Math.abs((piece.boardY || 0) - (correctRow * pieceHeight)) <= POSITION_TOLERANCE;

    return isCorrectCol && isCorrectRow;
  };

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

        const isLocked = isPieceInCorrectPosition(piece);
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
            <TouchableWithoutFeedback
              key={`${piece.id}-${piece.boardX}-${piece.boardY}`}
              onPress={(e) => e.stopPropagation()}
            >
              <View
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
                  styles.lockedPiece,
                ]}
              >
                <Image
                  key={`img-${piece.id}-${piece.boardX}-${piece.boardY}`}
                  source={{ uri: piece.imageUri }}
                  style={styles.boardPieceImage}
                  resizeMode="cover"
                />
                <View style={styles.lockIndicator} />
              </View>
            </TouchableWithoutFeedback>
          );
        }

        return (
          <TouchableOpacity
            key={`${piece.id}-${piece.boardX}-${piece.boardY}`}
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
            <Image
              key={`img-${piece.id}-${piece.boardX}-${piece.boardY}`}
              source={{ uri: piece.imageUri }}
              style={styles.boardPieceImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
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
