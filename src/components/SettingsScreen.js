import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_THEME_KEY } from '../constants/colors';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'normal', label: 'Normal (Pastel)', icon: 'color-palette-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 30,
      paddingTop: 40,
      paddingBottom: 90,
      alignItems: 'center',
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
    section: {
      width: '100%',
      marginTop: 16,
    },
    sectionTitle: {
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
    dataNoticeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dataNoticeText: {
      flex: 1,
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: 20,
    },
  });

export const SettingsScreen = () => {
  const { theme, themeKey, setThemeKey } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your experience</Text>

          {/* Data notice */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>
            <View style={styles.dataNoticeCard}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textMuted} />
              <Text style={styles.dataNoticeText}>
                Images and calendar data are stored only on this device. If you uninstall the app, all image pointers and data will be lost.
              </Text>
            </View>
          </View>

          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
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
      </ScrollView>
    </View>
  );
};
