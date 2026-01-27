import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const getConfettiColors = (theme) => [
  theme.accent,
  theme.success,
  theme.pastelBlue,
  theme.pastelGreen,
  theme.error || '#FFB3BA',
  '#FFD3A5',
  '#BAE1FF',
  '#FFDFBA',
];

const CONFETTI_PER_CORNER = 30;
const CONFETTI_WIDTH = 10;
const CONFETTI_HEIGHT = 6;
const LAUNCH_DURATION = 600;
const FALL_DURATION = 2800;
const LAUNCH_VELOCITY = 550;
const ANGLE_SPREAD = 25; // degrees of spread per cannon

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const degToRad = (deg) => (deg * Math.PI) / 180;

function generateConfettiFromCorners(boardWidth, boardHeight, colors) {
  const items = [];
  let id = 0;
  const fallDistance = boardHeight + 300;

  // Bottom-left corner: shoot at angle (up and to the right)
  for (let i = 0; i < CONFETTI_PER_CORNER; i++) {
    const baseAngle = 45;
    const angleVariation = rand(-ANGLE_SPREAD, ANGLE_SPREAD);
    const angle = degToRad(baseAngle + angleVariation);
    const velocity = rand(LAUNCH_VELOCITY * 0.7, LAUNCH_VELOCITY);
    
    const launchX = Math.cos(angle) * velocity;
    const launchY = -Math.sin(angle) * velocity;
    
    items.push({
      id: `confetti-${id++}-${Date.now()}`,
      color: colors[randInt(0, colors.length - 1)],
      startX: 0,
      startY: boardHeight,
      translateXLaunch: launchX,
      translateYLaunch: launchY,
      translateXFinal: launchX + rand(-40, 40),
      translateYFinal: launchY + fallDistance,
      delay: rand(0, 150),
    });
  }

  // Bottom-right corner: shoot at angle (up and to the left)
  for (let i = 0; i < CONFETTI_PER_CORNER; i++) {
    const baseAngle = 135;
    const angleVariation = rand(-ANGLE_SPREAD, ANGLE_SPREAD);
    const angle = degToRad(baseAngle + angleVariation);
    const velocity = rand(LAUNCH_VELOCITY * 0.7, LAUNCH_VELOCITY);
    
    const launchX = Math.cos(angle) * velocity;
    const launchY = -Math.sin(angle) * velocity;
    
    items.push({
      id: `confetti-${id++}-${Date.now()}`,
      color: colors[randInt(0, colors.length - 1)],
      startX: boardWidth,
      startY: boardHeight,
      translateXLaunch: launchX,
      translateYLaunch: launchY,
      translateXFinal: launchX + rand(-40, 40),
      translateYFinal: launchY + fallDistance,
      delay: rand(0, 150),
    });
  }

  return items;
}

const ConfettiPiece = ({
  color,
  delay,
  startX,
  startY,
  translateXLaunch,
  translateYLaunch,
  translateXFinal,
  translateYFinal,
  onComplete,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const hasCalledCompleteRef = useRef(false);

  useEffect(() => {
    const totalDuration = delay + LAUNCH_DURATION + FALL_DURATION;
    const fadeStart = delay + LAUNCH_DURATION + FALL_DURATION * 0.7;

    const timeoutId = setTimeout(() => {
      if (!hasCalledCompleteRef.current && onComplete) {
        hasCalledCompleteRef.current = true;
        onComplete();
      }
    }, totalDuration);

    // Launch phase: shoot upward and outward at angle
    const launch = Animated.parallel([
      Animated.timing(translateX, {
        toValue: translateXLaunch,
        duration: LAUNCH_DURATION,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: translateYLaunch,
        duration: LAUNCH_DURATION,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    // Fall phase: slowly fall down (gravity), with slight X drift
    const fall = Animated.parallel([
      Animated.timing(translateX, {
        toValue: translateXFinal,
        duration: FALL_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: translateYFinal,
        duration: FALL_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const rotateAnim = Animated.timing(rotate, {
      toValue: 360 * 4,
      duration: LAUNCH_DURATION + FALL_DURATION,
      delay,
      useNativeDriver: true,
    });

    const fadeOut = Animated.sequence([
      Animated.delay(fadeStart),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FALL_DURATION * 0.3,
        useNativeDriver: true,
      }),
    ]);

    const sequence = Animated.sequence([launch, fall]);
    const animation = Animated.parallel([sequence, rotateAnim, fadeOut]);
    animation.start();

    return () => {
      clearTimeout(timeoutId);
      animation.stop();
    };
  }, [onComplete, delay, translateXLaunch, translateYLaunch, translateXFinal, translateYFinal]);

  const rotateDegrees = rotate.interpolate({
    inputRange: [0, 1080],
    outputRange: ['0deg', '1080deg'],
  });

  const halfWidth = CONFETTI_WIDTH / 2;
  const halfHeight = CONFETTI_HEIGHT / 2;
  const left = startX - halfWidth;
  const top = startY - halfHeight;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          left,
          top,
          transform: [
            { translateX },
            { translateY },
            { rotate: rotateDegrees },
          ],
          opacity,
        },
      ]}
    />
  );
};

const CONFETTI_COUNT = CONFETTI_PER_CORNER * 2;

export const Confetti = ({ isActive, boardWidth, boardHeight, onAllComplete }) => {
  const { theme } = useTheme();
  const confettiColors = useMemo(() => getConfettiColors(theme), [theme]);
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
      completedCountRef.current = 0;
      hasTriggeredRef.current = false;
      confettiDataRef.current = generateConfettiFromCorners(boardWidth, boardHeight, confettiColors);
      setDataReady(true);
    } else if (!isActive) {
      confettiDataRef.current = null;
      setDataReady(false);
    }
  }, [isActive, boardWidth, boardHeight, confettiColors]);

  const handlePieceComplete = useCallback(() => {
    completedCountRef.current += 1;
    if (
      completedCountRef.current >= CONFETTI_COUNT &&
      !hasTriggeredRef.current &&
      onAllCompleteRef.current
    ) {
      hasTriggeredRef.current = true;
      onAllCompleteRef.current();
    }
  }, []);

  const confettiPieces = useMemo(() => {
    if (
      !isActive ||
      !dataReady ||
      !confettiDataRef.current ||
      boardWidth <= 0 ||
      boardHeight <= 0
    ) {
      return null;
    }

    return confettiDataRef.current.map((data) => (
      <ConfettiPiece
        key={data.id}
        color={data.color}
        delay={data.delay}
        startX={data.startX}
        startY={data.startY}
        translateXLaunch={data.translateXLaunch}
        translateYLaunch={data.translateYLaunch}
        translateXFinal={data.translateXFinal}
        translateYFinal={data.translateYFinal}
        onComplete={handlePieceComplete}
      />
    ));
  }, [isActive, dataReady, boardHeight, boardWidth, handlePieceComplete]);

  if (
    !isActive ||
    !dataReady ||
    !confettiPieces ||
    boardWidth <= 0 ||
    boardHeight <= 0
  ) {
    return null;
  }

  return (
    <View
      style={[styles.container, { width: boardWidth, height: boardHeight }]}
      pointerEvents="none"
    >
      {confettiPieces}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
    zIndex: 1000,
  },
  confettiPiece: {
    position: 'absolute',
    width: CONFETTI_WIDTH,
    height: CONFETTI_HEIGHT,
    borderRadius: 2,
  },
});
