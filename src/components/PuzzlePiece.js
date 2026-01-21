import React, { useMemo, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
  // Animated values for smooth transitions
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate when selection state changes
  useEffect(() => {
    if (isSelected) {
      Animated.spring(scaleAnim, {
        toValue: 1.08,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else if (isSelected2) {
      Animated.spring(scaleAnim, {
        toValue: 1.04,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, isSelected2, scaleAnim]);

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
