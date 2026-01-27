import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingTop: 40,
      paddingBottom: 90,
    },
    content: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 60,
      width: '100%',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 2,
      borderColor: theme.border,
    },
    title: {
      fontSize: 42,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    buttonContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 50,
    },
    newGameButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pastelBlue,
      paddingVertical: 18,
      paddingHorizontal: 48,
      borderRadius: 24,
      elevation: 4,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      minWidth: 220,
      borderWidth: 2,
      borderColor: theme.pastelBlueLight,
    },
    buttonIcon: {
      marginRight: 8,
    },
    newGameButtonText: {
      color: theme.white,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    featuresContainer: {
      width: '100%',
      gap: 16,
      paddingHorizontal: 20,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    featureText: {
      fontSize: 15,
      color: theme.text,
      fontWeight: '500',
    },
  });

export const HomeScreen = ({ onNewGame }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="grid" size={48} color={theme.accent} />
          </View>
          <Text style={styles.title}>Puzzles</Text>
          <Text style={styles.subtitle}>Dolphins and Noggins</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.newGameButton}
            onPress={onNewGame}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color={theme.white} style={styles.buttonIcon} />
            <Text style={styles.newGameButtonText}>New Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
