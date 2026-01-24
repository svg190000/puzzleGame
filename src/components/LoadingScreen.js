import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { PaperBackground } from './PaperBackground';
import { COLORS } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoadingScreen = ({ message = 'Loading...', isVisible = true, onExitComplete }) => {
  const translateY = useSharedValue(-SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Entry animation: drop from top, bounce, then settle
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSequence(
        withTiming(0, { duration: 400 }), // Drop down
        withSpring(-20, { damping: 8, stiffness: 100 }), // Bounce up
        withSpring(0, { damping: 10, stiffness: 120 }) // Settle
      );
    } else {
      // Exit animation: jump up, then fall down out of view
      translateY.value = withSequence(
        withSpring(-50, { damping: 8, stiffness: 150 }), // Jump up
        withTiming(SCREEN_HEIGHT, { duration: 400 }) // Fall down out of view
      );
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished && onExitComplete) {
          runOnJS(onExitComplete)();
        }
      });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <PaperBackground style={styles.background}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.pastelBlue} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </PaperBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -200, // Extra space at top to cover bounce/jump animations
    left: 0,
    right: 0,
    bottom: -200, // Extra space at bottom to cover bounce/jump animations
    height: SCREEN_HEIGHT + 400, // Total height includes extra space for animations
    zIndex: 9999,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 16,
  },
});
