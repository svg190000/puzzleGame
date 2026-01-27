import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export const HomeScreen = ({ onNewGame }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="grid" size={48} color={COLORS.accent} />
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
            <Ionicons name="add-circle" size={24} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.newGameButtonText}>New Game</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="image-outline" size={20} color={COLORS.accent} />
            <Text style={styles.featureText}>Choose your own image</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="options-outline" size={20} color={COLORS.accent} />
            <Text style={styles.featureText}>Multiple difficulty levels</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.featureText}>Hints available</Text>
          </View>
        </View> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.pastelBlue,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 24,
    elevation: 4,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minWidth: 220,
    borderWidth: 2,
    borderColor: COLORS.pastelBlueLight,
  },
  buttonIcon: {
    marginRight: 8,
  },
  newGameButtonText: {
    color: COLORS.white,
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
    color: COLORS.text,
    fontWeight: '500',
  },
});
