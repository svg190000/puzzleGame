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
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSequence(
        withTiming(0, { duration: 400 }),
        withSpring(-20, { damping: 8, stiffness: 100 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      );
    } else {
      translateY.value = withSequence(
        withSpring(-50, { damping: 8, stiffness: 150 }),
        withTiming(SCREEN_HEIGHT, { duration: 400 })
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
    top: -200,
    left: 0,
    right: 0,
    bottom: -200,
    height: SCREEN_HEIGHT + 400,
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
