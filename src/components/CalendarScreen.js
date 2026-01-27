import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
      flex: 1,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      justifyContent: 'center',
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
    },
  });

export const CalendarScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>Calendar screen coming soon</Text>
      </View>
    </View>
  );
};
