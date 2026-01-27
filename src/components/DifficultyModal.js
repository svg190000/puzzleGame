import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';

const DIFFICULTIES = [
  { label: 'Easy', rows: 3, cols: 3 },
  { label: 'Medium', rows: 4, cols: 4 },
  { label: 'Hard', rows: 6, cols: 6 },
];

export const DifficultyModal = ({ visible, onSelect, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar style="dark" />
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Select Difficulty</Text>
          <View style={styles.buttonContainer}>
            {DIFFICULTIES.map((difficulty, index) => (
              <TouchableOpacity
                key={index}
                style={styles.button}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onSelect(difficulty);
                }}
              >
                <Text style={styles.buttonText}>{difficulty.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.white,
    margin: 0,
    padding: 0,
  },
  modal: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
});
