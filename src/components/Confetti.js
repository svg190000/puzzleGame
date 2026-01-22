import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

const CONFETTI_COLORS = [
  COLORS.accent || '#FF6B6B',
  COLORS.success || '#51CF66',
  COLORS.pastelBlue || '#74C0FC',
  COLORS.pastelGreen || '#69DB7C',
  '#FFB3BA',
  '#FFD3A5',
  '#BAE1FF',
  '#FFDFBA',
];
const CONFETTI_COUNT = 50;

const ConfettiPiece = ({ color, delay, startX, duration, onComplete }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const totalDuration = delay + duration;
    
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 1000,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 360 * 3,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.7),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
    ]);
    
    animation.start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }, [onComplete]);

  const rotateDegrees = rotate.interpolate({
    inputRange: [0, 1080],
    outputRange: ['0deg', '1080deg'],
  });

  const animatedStyle = {
    transform: [
      { translateY },
      { rotate: rotateDegrees },
    ],
    opacity,
  };

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          left: startX,
          ...animatedStyle,
        }
      ]}
    />
  );
};

export const Confetti = ({ isActive, boardWidth, boardHeight, onAllComplete }) => {
  const completedCountRef = useRef(0);
  const onAllCompleteRef = useRef(onAllComplete);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    onAllCompleteRef.current = onAllComplete;
  }, [onAllComplete]);

  useEffect(() => {
    if (isActive) {
      completedCountRef.current = 0;
      hasTriggeredRef.current = false;
    }
  }, [isActive]);

  if (!isActive) return null;

  const handlePieceComplete = () => {
    completedCountRef.current += 1;
    if (completedCountRef.current >= CONFETTI_COUNT && !hasTriggeredRef.current && onAllCompleteRef.current) {
      hasTriggeredRef.current = true;
      onAllCompleteRef.current();
    }
  };

  const confettiPieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const startX = Math.random() * boardWidth;
    const delay = Math.random() * 300;
    const duration = 2000 + Math.random() * 1000;

    return (
      <ConfettiPiece
        key={i}
        color={color}
        delay={delay}
        startX={startX}
        duration={duration}
        onComplete={handlePieceComplete}
      />
    );
  });

  return (
    <View style={[styles.container, { width: boardWidth, height: boardHeight }]} pointerEvents="none">
      {confettiPieces}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: -10,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
