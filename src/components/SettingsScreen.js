import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, DEFAULT_THEME_KEY } from '../constants/colors';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'normal', label: 'Normal (Pastel)', icon: 'color-palette-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-start',
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
    title: {
      fontSize: 42,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 32,
    },
    themeSection: {
      width: '100%',
      marginTop: 16,
    },
    themeSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 2,
      borderColor: theme.border,
    },
    themeOptionActive: {
      borderColor: theme.accent,
      backgroundColor: theme.softHighlight || theme.surfaceAlt,
    },
    themeOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    themeOptionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    themeOptionCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
  });

export const SettingsScreen = () => {
  const { theme, themeKey, setThemeKey } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Choose how the app looks</Text>

        <View style={styles.themeSection}>
          <Text style={styles.themeSectionTitle}>Theme</Text>
          {THEME_OPTIONS.map((opt) => {
            const isActive = (themeKey ?? DEFAULT_THEME_KEY) === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themeOption, isActive && styles.themeOptionActive]}
                onPress={() => setThemeKey(opt.key)}
                activeOpacity={0.8}
              >
                <View style={styles.themeOptionLeft}>
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={isActive ? theme.accent : theme.textMuted}
                  />
                  <Text style={styles.themeOptionLabel}>{opt.label}</Text>
                </View>
                {isActive && (
                  <View style={styles.themeOptionCheck}>
                    <Ionicons name="checkmark" size={16} color={theme.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};
