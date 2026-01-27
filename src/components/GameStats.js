import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statItem: { alignItems: 'center' },
    divider: {
      width: 1,
      height: 24,
      backgroundColor: theme.border,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.textMuted,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
  });

export const GameStats = ({ timer, moveCount }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Time</Text>
        <Text style={styles.statValue}>{formatTime(timer)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Moves</Text>
        <Text style={styles.statValue}>{moveCount}</Text>
      </View>
    </View>
  );
};
