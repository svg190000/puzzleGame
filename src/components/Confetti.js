import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
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
const CONFETTI_COUNT = 20;

const ConfettiPiece = ({ color, delay, startX, duration, onComplete, boardHeight }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const hasCalledCompleteRef = useRef(false);

  useEffect(() => {
    if (!boardHeight || boardHeight <= 0) return;
    
    // Calculate when piece falls out of view
    // Piece starts at top: -10, so it's out of view when translateY >= boardHeight + 10
    const outOfViewY = boardHeight + 10;
    
    // Calculate the time it takes to fall out of view
    // translateY animates from 0 to 1000 over 'duration' milliseconds
    // We need to find when it reaches outOfViewY
    const totalDistance = 1000;
    const outOfViewProgress = Math.min(outOfViewY / totalDistance, 1);
    const outOfViewTime = duration * outOfViewProgress;
    
    // Calculate when this piece will fall out of view (delay + time to reach outOfViewY)
    const timeToOutOfView = delay + outOfViewTime;
    
    // Set timeout to call onComplete when piece falls out of view
    const timeoutId = setTimeout(() => {
      if (!hasCalledCompleteRef.current && onComplete) {
        hasCalledCompleteRef.current = true;
        onComplete();
      }
    }, timeToOutOfView);
    
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
    
    animation.start();
    
    return () => {
      clearTimeout(timeoutId);
      animation.stop();
    };
  }, [onComplete, boardHeight, delay, duration]);

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
  const confettiDataRef = useRef(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    onAllCompleteRef.current = onAllComplete;
  }, [onAllComplete]);

  useEffect(() => {
    if (isActive && boardWidth > 0 && boardHeight > 0) {
      console.log('Confetti activated!', { boardWidth, boardHeight, CONFETTI_COUNT });
      completedCountRef.current = 0;
      hasTriggeredRef.current = false;
      // Always regenerate confetti data when activated to ensure fresh start
      confettiDataRef.current = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: `confetti-${i}-${Date.now()}`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        startX: Math.random() * boardWidth,
        delay: Math.random() * 300,
        duration: 2000 + Math.random() * 1000,
      }));
      console.log('Confetti data generated:', confettiDataRef.current.length, 'pieces');
      setDataReady(true);
    } else if (!isActive) {
      // Reset when deactivated
      confettiDataRef.current = null;
      setDataReady(false);
    }
  }, [isActive, boardWidth, boardHeight]);

  const handlePieceCompleteRef = useRef(() => {
    completedCountRef.current += 1;
    if (completedCountRef.current >= CONFETTI_COUNT && !hasTriggeredRef.current && onAllCompleteRef.current) {
      hasTriggeredRef.current = true;
      onAllCompleteRef.current();
    }
  });

  useEffect(() => {
    handlePieceCompleteRef.current = () => {
      completedCountRef.current += 1;
      if (completedCountRef.current >= CONFETTI_COUNT && !hasTriggeredRef.current && onAllCompleteRef.current) {
        hasTriggeredRef.current = true;
        onAllCompleteRef.current();
      }
    };
  }, []);

  const confettiPieces = useMemo(() => {
    if (!isActive || !dataReady || !confettiDataRef.current || boardWidth <= 0 || boardHeight <= 0) {
      console.log('Confetti pieces not created:', { isActive, dataReady, hasData: !!confettiDataRef.current, boardWidth, boardHeight });
      return null;
    }
    
    console.log('Creating confetti pieces:', confettiDataRef.current.length);
    return confettiDataRef.current.map((data) => (
      <ConfettiPiece
        key={data.id}
        color={data.color}
        delay={data.delay}
        startX={data.startX}
        duration={data.duration}
        onComplete={() => handlePieceCompleteRef.current()}
        boardHeight={boardHeight}
      />
    ));
  }, [isActive, dataReady, boardHeight, boardWidth]);

  if (!isActive || !dataReady || !confettiPieces || boardWidth <= 0 || boardHeight <= 0) {
    return null;
  }
  
  console.log('Rendering confetti with', confettiPieces.length, 'pieces');

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
    zIndex: 1000,
  },
  confettiPiece: {
    position: 'absolute',
    top: -10,
    width: 16,
    height: 16,
    borderRadius: 4,
  },
});
