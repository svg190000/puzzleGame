import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export const PaperBackground = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* Texture layers for paper effect */}
      <View style={styles.textureLayer1} />
      <View style={styles.textureLayer2} />
      <View style={styles.textureLayer3} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  textureLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.paperTexture,
    opacity: 0.4,
  },
  textureLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.border,
    opacity: 0.15,
  },
  textureLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    opacity: 0.6,
  },
});
