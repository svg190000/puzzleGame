import React, { useMemo, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

const BORDER_WIDTH = 3;
const SELECTION_ANIMATION_CONFIG = {
  spring: { friction: 8, tension: 100, useNativeDriver: true },
  scales: { selected: 1.08, selected2: 1.04, default: 1 },
};

export const PuzzlePiece = ({
  piece,
  pieceWidth = 0,
  pieceHeight = 0,
  isSelected = false,
  isSelected2 = false,
  onPress,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const targetScale = isSelected 
      ? SELECTION_ANIMATION_CONFIG.scales.selected 
      : isSelected2 
        ? SELECTION_ANIMATION_CONFIG.scales.selected2 
        : SELECTION_ANIMATION_CONFIG.scales.default;
    
    Animated.spring(scaleAnim, {
      toValue: targetScale,
      ...SELECTION_ANIMATION_CONFIG.spring,
    }).start();
  }, [isSelected, isSelected2, scaleAnim]);

  if (!piece || !piece.imageUri) {
    return null;
  }

  // Boolean to track if piece is highlighted (selected)
  const isHighlighted = isSelected || isSelected2;

  const imageSource = useMemo(() => ({ uri: piece.imageUri }), [piece.imageUri]);

  const borderStyle = isSelected 
    ? { borderWidth: BORDER_WIDTH, borderColor: COLORS.accent }
    : isSelected2 
      ? { borderWidth: BORDER_WIDTH, borderColor: COLORS.pastelGreen }
      : { borderWidth: BORDER_WIDTH, borderColor: 'transparent' };

  // Animated transform style
  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    zIndex: isSelected ? 100 : isSelected2 ? 50 : 1,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(piece)}
      style={style}
    >
      <Animated.View
        style={[
          styles.pieceContainer,
          {
            width: pieceWidth || 0,
            height: pieceHeight || 0,
            ...borderStyle,
          },
          isHighlighted && (isSelected ? styles.selectedPiece : styles.selectedPiece2),
          animatedStyle,
        ]}
      >
        <Image
          key={`piece-img-${piece.id}`}
          source={imageSource}
          style={styles.pieceImage}
          resizeMode="cover"
        />
      </Animated.View>
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
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  selectedPiece2: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  pieceImage: {
    width: '100%',
    height: '100%',
  },
});
