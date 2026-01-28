import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      width: SCREEN_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      paddingTop: 8,
      paddingBottom: 20,
      paddingHorizontal: 0,
      marginHorizontal: 0,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.navBarBackground,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    navButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 6,
      minHeight: 50,
    },
    navButtonContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      position: 'relative',
      width: '100%',
    },
    navButtonText: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '500',
      marginTop: 0,
    },
    navButtonTextActive: {
      color: theme.accent,
      fontWeight: '600',
    },
  });

const NavButton = ({ icon, label, isActive, onPress, theme }) => {
  const scale = useSharedValue(isActive ? 1.3 : 1);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    scale.value = withTiming(isActive ? 1.3 : 1, {
      duration: 200,
    });
  }, [isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.navButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.navButtonContent, animatedStyle]}>
        <Ionicons
          name={icon}
          size={isActive ? 26 : 24}
          color={isActive ? theme.accent : theme.text}
        />
        <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const NavigationBar = ({ navigation, currentRouteName }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <NavButton
        icon="calendar-outline"
        label="Calendar"
        isActive={currentRouteName === 'Calendar'}
        onPress={() => navigation.navigate('Calendar')}
        theme={theme}
      />
      <NavButton
        icon="home"
        label="Home"
        isActive={currentRouteName === 'Home'}
        onPress={() => navigation.navigate('Home')}
        theme={theme}
      />
      <NavButton
        icon="settings-outline"
        label="Settings"
        isActive={currentRouteName === 'Settings'}
        onPress={() => navigation.navigate('Settings')}
        theme={theme}
      />
    </View>
  );
};
