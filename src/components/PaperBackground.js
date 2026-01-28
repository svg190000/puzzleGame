import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground ?? theme.background,
      position: 'relative',
    },
    textureLayer1: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.paperTexture,
      opacity: 0.4,
    },
    textureLayer2: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.border,
      opacity: 0.15,
    },
    textureLayer3: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      opacity: 0.6,
    },
  });

export const PaperBackground = ({ children, style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textureLayer1} />
      <View style={styles.textureLayer2} />
      <View style={styles.textureLayer3} />
      {children}
    </View>
  );
};
