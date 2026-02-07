import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCalendar } from '../contexts/CalendarContext';
import { THEMES, DEFAULT_THEME_KEY } from '../constants/colors';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'normal', label: 'Normal (Pastel)', icon: 'color-palette-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const SYNC_STATUS_CONFIG = {
  idle: { icon: 'cloud-outline', label: 'Not synced', color: 'textMuted' },
  syncing: { icon: 'sync', label: 'Syncing...', color: 'accent' },
  synced: { icon: 'cloud-done', label: 'Synced', color: 'success' },
  offline: { icon: 'cloud-offline', label: 'Offline – will sync when connected', color: 'textMuted' },
  error: { icon: 'cloud-offline', label: 'Sync error', color: 'error' },
};

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
    // Account section styles
    accountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    accountAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    accountInfo: {
      flex: 1,
    },
    accountEmail: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    accountStatus: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    syncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    syncLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    syncLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    syncButtonText: {
      color: theme.buttonText,
      fontSize: 14,
      fontWeight: '600',
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.error}15`,
      borderRadius: 12,
      paddingVertical: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: `${theme.error}30`,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.error,
    },
    notSignedInCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    notSignedInText: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 4,
    },
    notSignedInHint: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      opacity: 0.8,
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

export const SettingsScreen = ({ onNavigateToAuth }) => {
  const { theme, themeKey, setThemeKey } = useTheme();
  const { user, isAuthenticated, signOut, isConfigured } = useAuth();
  const { syncStatus, triggerSync, clearLocalData } = useCalendar();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Do you want to clear local data when signing out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep Data',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            setSigningOut(false);
          },
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await clearLocalData();
            await signOut();
            setSigningOut(false);
          },
        },
      ]
    );
  }, [signOut, clearLocalData]);

  const handleSync = useCallback(() => {
    if (syncStatus !== 'syncing') {
      triggerSync();
    }
  }, [syncStatus, triggerSync]);

  const syncConfig = SYNC_STATUS_CONFIG[syncStatus] || SYNC_STATUS_CONFIG.idle;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your experience</Text>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {isAuthenticated && user ? (
            <>
              <View style={styles.accountCard}>
                <View style={styles.accountAvatar}>
                  <Ionicons name="person" size={24} color={theme.buttonText} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Text style={styles.accountStatus}>Signed in</Text>
                </View>
              </View>

              <View style={styles.syncRow}>
                <View style={styles.syncLeft}>
                  <Ionicons
                    name={syncConfig.icon}
                    size={22}
                    color={theme[syncConfig.color]}
                  />
                  <Text style={styles.syncLabel}>{syncConfig.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleSync}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color={theme.buttonText} />
                  ) : (
                    <>
                      <Ionicons name="sync" size={16} color={theme.buttonText} />
                      <Text style={styles.syncButtonText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={theme.error} />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color={theme.error} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.notSignedInCard}>
              <Text style={styles.notSignedInText}>
                {isConfigured 
                  ? 'Sign in to sync your memories across devices'
                  : 'Cloud sync not configured'}
              </Text>
              <Text style={styles.notSignedInHint}>
                {isConfigured
                  ? 'Your data is saved locally'
                  : 'Add Supabase credentials to enable sync'}
              </Text>
            </View>
          )}
        </View>

        {/* Data notice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.dataNoticeCard}>
            <Ionicons name="information-circle-outline" size={20} color={theme.textMuted} />
            <Text style={styles.dataNoticeText}>
              Images are stored locally and will be lost if you uninstall the app.
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
    </View>
  );
};
