import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Polaroid } from './Polaroid';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COMPLETION_MESSAGES = [
  "Amazing work!",
  "You're a puzzle master!",
  "Incredible!",
  "Well done!",
  "Perfect!",
  "Outstanding!",
  "Brilliant!",
  "Fantastic!",
  "Excellent!",
  "You nailed it!",
];

const getRandomMessage = () => {
  return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: theme.background,
    },
    polaroidSection: {
      paddingTop: 50,
      paddingHorizontal: 24,
      paddingBottom: 20,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingVertical: 20,
      paddingBottom: 90,
      paddingHorizontal: 24,
    },
    statsScrollView: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: SCREEN_WIDTH - 48,
      marginTop: 20,
      marginBottom: 32,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: theme.surface,
      borderRadius: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.border,
      marginHorizontal: 12,
    },
    buttonFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      width: SCREEN_WIDTH,
      backgroundColor: theme.background,
      paddingTop: 12,
      paddingBottom: 24,
      paddingHorizontal: 24,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    buttonContainer: {
      width: '100%',
      maxWidth: SCREEN_WIDTH - 48,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    iconButton: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceAlt,
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    primaryButton: {
      backgroundColor: theme.accent,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonText: {
      color: theme.buttonText,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });

export const CompletionScreen = ({ 
  timer, 
  moveCount, 
  difficulty, 
  originalImageUri,
  imageWidth,
  imageHeight,
  onPlayAgain, 
  onBackToMenu,
  onSettings 
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [message] = useState(() => getRandomMessage());

  return (
    <View style={styles.container}>
      <View style={styles.polaroidSection}>
        <Polaroid
          imageUri={originalImageUri}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          caption={message}
          maxWidth={SCREEN_WIDTH - 48}
          animate
        />
      </View>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.statsScrollView}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(timer)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Moves</Text>
            <Text style={styles.statValue}>{moveCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Difficulty</Text>
            <Text style={styles.statValue}>{difficulty.rows}×{difficulty.cols}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttonFooter}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackToMenu}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={26} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onPlayAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={typeof onSettings === 'function' ? onSettings : undefined}
            activeOpacity={0.8}
          >
            <Ionicons name="settings" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
