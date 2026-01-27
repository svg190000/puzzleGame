import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

const DIFFICULTIES = [
  { label: 'Easy', rows: 3, cols: 3 },
  { label: 'Medium', rows: 4, cols: 4 },
  { label: 'Hard', rows: 6, cols: 6 },
];

export const DifficultyModal = ({ visible, onSelect, onClose }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const animateClose = () => {
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: ANIMATION_DURATION }, () => {
      runOnJS(setModalVisible)(false);
    });
  };

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      translateY.value = withTiming(0, { duration: ANIMATION_DURATION });
    } else if (modalVisible) {
      animateClose();
    }
  }, [visible, modalVisible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    onClose();
    animateClose();
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.modal, contentStyle]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Select Difficulty</Text>
        <View style={styles.buttonContainer}>
          {DIFFICULTIES.map((difficulty) => (
            <TouchableOpacity
              key={difficulty.label}
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
        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 24,
    marginTop: -8,
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
