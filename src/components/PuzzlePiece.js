import React, { useMemo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';

export const PuzzlePiece = ({
  piece,
  pieceWidth = 0,
  pieceHeight = 0,
  isSelected = false,
  isSelected2 = false,
  onPress,
  style,
}) => {
  if (!piece || !piece.imageUri) {
    return null;
  }

  // Boolean to track if piece is highlighted (selected)
  const isHighlighted = isSelected || isSelected2;

  const imageSource = useMemo(() => ({ uri: piece.imageUri }), [piece.imageUri]);

  // Determine border style based on selection state
  // Always reserve 3px border space to prevent layout shifts
  const borderStyle = isSelected 
    ? { borderWidth: 3, borderColor: COLORS.accent }
    : isSelected2 
    ? { borderWidth: 3, borderColor: COLORS.pastelGreen }
    : { borderWidth: 3, borderColor: 'transparent' };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(piece)}
      style={style}
    >
      <View
        style={[
          styles.pieceContainer,
          {
            width: pieceWidth || 0,
            height: pieceHeight || 0,
            ...borderStyle,
          },
          isHighlighted && (isSelected ? styles.selectedPiece : styles.selectedPiece2),
        ]}
      >
        <Image
          key={`piece-img-${piece.id}`}
          source={imageSource}
          style={styles.pieceImage}
          resizeMode="cover"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pieceContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPiece: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedPiece2: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pieceImage: {
    width: '100%',
    height: '100%',
  },
});
