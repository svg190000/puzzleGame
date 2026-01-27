import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NavButton = ({ icon, label, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.15 : 1, {
      damping: 15,
      stiffness: 150,
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
        {isActive && <View style={styles.activeIndicator} />}
        <Ionicons 
          name={icon} 
          size={isActive ? 26 : 24} 
          color={isActive ? COLORS.accent : COLORS.text} 
        />
        <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const NavigationBar = ({ currentScreen, onNavigate }) => {
  return (
    <View style={styles.container}>
      <NavButton
        icon="calendar-outline"
        label="Calendar"
        isActive={currentScreen === 'calendar'}
        onPress={() => onNavigate('calendar')}
      />
      <NavButton
        icon="home"
        label="Home"
        isActive={currentScreen === 'home'}
        onPress={() => onNavigate('home')}
      />
      <NavButton
        icon="settings-outline"
        label="Settings"
        isActive={currentScreen === 'settings'}
        onPress={() => onNavigate('settings')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    minHeight: 60,
  },
  navButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
    width: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 40,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  navButtonText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  navButtonTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});
