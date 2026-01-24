import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Easing, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COMPLETION_MESSAGES = [
  "Amazing work!",
  "You're a puzzle master!",
  "Incredible!",
  "Well done!",
  "Perfect!",
  "Outstanding!",
  "Brilliant!",
  "Fantastic!",
  "Excellent!",
  "You nailed it!",
];

const getRandomMessage = () => {
  return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const CompletionModal = ({ 
  visible, 
  timer, 
  moveCount, 
  difficulty, 
  originalImageUri,
  imageWidth,
  imageHeight,
  onPlayAgain, 
  onBackToMenu,
  onSettings 
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const polaroidScale = useRef(new Animated.Value(0.3)).current;
  const polaroidOpacity = useRef(new Animated.Value(0)).current;
  const polaroidTranslateY = useRef(new Animated.Value(100)).current;
  const polaroidRotate = useRef(new Animated.Value(0)).current;
  const polaroidPivotOffset = useRef(new Animated.Value(0)).current;
  const polaroidPivotOffsetNegative = useRef(new Animated.Value(0)).current;
  const thumbtackScale = useRef(new Animated.Value(0)).current;
  const thumbtackOpacity = useRef(new Animated.Value(0)).current;
  const messageRef = useRef(getRandomMessage());

  useEffect(() => {
    if (visible) {
      messageRef.current = getRandomMessage();
      
      // Reset polaroid and thumbtack animations
      polaroidScale.setValue(0.3);
      polaroidOpacity.setValue(0);
      polaroidTranslateY.setValue(100);
      polaroidRotate.setValue(0);
      polaroidPivotOffset.setValue(0);
      polaroidPivotOffsetNegative.setValue(0);
      thumbtackScale.setValue(0);
      thumbtackOpacity.setValue(0);
      
      // Animate backdrop and card first
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(cardScale, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // After card animation, bring polaroid into frame
        Animated.parallel([
          Animated.sequence([
            Animated.parallel([
              Animated.timing(polaroidScale, {
                toValue: 1.1,
                duration: 400,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
              }),
              Animated.timing(polaroidOpacity, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(polaroidTranslateY, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(polaroidScale, {
              toValue: 1,
              duration: 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          // After polaroid settles, pin it with thumbtack
          Animated.parallel([
            Animated.sequence([
              Animated.timing(thumbtackScale, {
                toValue: 1.3,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(thumbtackScale, {
                toValue: 1,
                duration: 150,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(thumbtackOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Start swaying animation after thumbtack is pinned
            const createSwayAnimation = () => {
              return Animated.sequence([
                Animated.timing(polaroidRotate, {
                  toValue: 0.05, // ~3 degrees to the right
                  duration: 2000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(polaroidRotate, {
                  toValue: -0.05, // ~3 degrees to the left
                  duration: 2000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]);
            };

            const startSwayLoop = () => {
              createSwayAnimation().start(() => {
                startSwayLoop();
              });
            };

            startSwayLoop();
          });
        });
      });
    } else {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.9);
      cardOpacity.setValue(0);
      polaroidScale.setValue(0.3);
      polaroidOpacity.setValue(0);
      polaroidTranslateY.setValue(100);
      polaroidRotate.setValue(0);
      polaroidPivotOffset.setValue(0);
      polaroidPivotOffsetNegative.setValue(0);
      thumbtackScale.setValue(0);
      thumbtackOpacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            <View style={styles.polaroidContainer}>
              <View style={styles.pinFulcrum}>
                <Animated.View
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    if (height > 0) {
                      // Set the pivot offset to half the height (to rotate around top center)
                      const offset = height / 2;
                      polaroidPivotOffset.setValue(offset);
                      polaroidPivotOffsetNegative.setValue(-offset);
                    }
                  }}
                  style={[
                    styles.polaroidFrameWrapper,
                    {
                      transform: [
                        { translateY: polaroidPivotOffset },
                        { rotate: polaroidRotate.interpolate({
                            inputRange: [-0.05, 0.05],
                            outputRange: ['-0.05rad', '0.05rad'],
                          }) },
                        { translateY: polaroidPivotOffsetNegative },
                        { scale: polaroidScale },
                        { translateY: polaroidTranslateY },
                      ],
                      opacity: polaroidOpacity,
                      width: imageWidth ? imageWidth * 0.6 + 26 : '100%',
                    },
                  ]}
                >
                  <View style={styles.polaroidFrame}>
                    <Animated.View
                      style={[
                        styles.thumbtack,
                        {
                          transform: [{ scale: thumbtackScale }],
                          opacity: thumbtackOpacity,
                        },
                      ]}
                    >
                      <View style={styles.thumbtackCircle} />
                    </Animated.View>
                    {originalImageUri && imageWidth && imageHeight && (
                      <View style={[styles.imageSection, { width: imageWidth * 0.6 }]}>
                        <Image
                          source={{ uri: originalImageUri }}
                          style={[
                            styles.completedImage,
                            {
                              width: imageWidth * 0.6,
                              height: imageHeight * 0.6,
                            }
                          ]}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    <View style={styles.frameBottomSection}>
                      <Text style={styles.message}>{messageRef.current}</Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{formatTime(timer)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Moves</Text>
                <Text style={styles.statValue}>{moveCount}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Difficulty</Text>
                <Text style={styles.statValue}>{difficulty.rows}×{difficulty.cols}</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onBackToMenu}
                activeOpacity={0.8}
              >
                <Ionicons name="home" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onPlayAgain}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onSettings}
                activeOpacity={0.8}
              >
                <Ionicons name="settings" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 3000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    minHeight: SCREEN_HEIGHT,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 80,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  polaroidContainer: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  pinFulcrum: {
    alignItems: 'center',
    position: 'relative',
  },
  polaroidFrameWrapper: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    transformOrigin: 'top center',
  },
  thumbtack: {
    position: 'absolute',
    top: 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbtackCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  polaroidFrame: {
    backgroundColor: COLORS.white,
    borderWidth: 12,
    borderColor: COLORS.white,
    borderRadius: 5,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'visible',
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
    position: 'relative',
  },
  imageSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 0,
    backgroundColor: COLORS.white,
  },
  completedImage: {
    borderRadius: 2,
  },
  frameBottomSection: {
    width: '100%',
    height: 60,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
