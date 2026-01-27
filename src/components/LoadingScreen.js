import React, { useEffect, useMemo } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const makeStyles = (theme) =>
  StyleSheet.create({
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
      color: theme.text,
      textAlign: 'center',
      marginTop: 16,
    },
  });

export const LoadingScreen = ({ message = 'Loading...', isVisible = true, onExitComplete }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <PaperBackground style={styles.background}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.pastelBlue} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </PaperBackground>
    </Animated.View>
  );
};
