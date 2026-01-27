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

export const CompletionScreen = ({ 
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
    
    // Start polaroid animation
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
            // Start continuous swaying animation after thumbtack is pinned
            // Use a continuous loop with smooth easing for fluid motion without pause
            const createSwayLoop = () => {
              Animated.sequence([
                Animated.timing(polaroidRotate, {
                  toValue: 0.05, // ~3 degrees to the right
                  duration: 2000,
                  easing: Easing.bezier(0.42, 0, 0.58, 1), // Smooth ease in/out bezier
                  useNativeDriver: true,
                }),
                Animated.timing(polaroidRotate, {
                  toValue: -0.05, // ~3 degrees to the left
                  duration: 2000,
                  easing: Easing.bezier(0.42, 0, 0.58, 1), // Smooth ease in/out bezier
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Immediately start next iteration for continuous flow
                createSwayLoop();
              });
            };
            createSwayLoop();
          });
        });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.polaroidSection}>
        <View style={styles.polaroidContainer}>
          <View style={styles.pinFulcrum}>
            <Animated.View
              style={[
                {
                  transform: [
                    { translateY: polaroidTranslateY },
                    { scale: polaroidScale },
                  ],
                  opacity: polaroidOpacity,
                  width: imageWidth ? Math.min(imageWidth * 0.75 + 26, SCREEN_WIDTH - 48) : '100%',
                },
              ]}
            >
              <Animated.View
                onLayout={(event) => {
                  const { height } = event.nativeEvent.layout;
                  if (height > 0) {
                    // Pivot point is at the top center (y=0), so we need to translate down by half height
                    // to move the top center to the rotation origin, then rotate, then translate back
                    const offset = height / 2;
                    polaroidPivotOffset.setValue(offset);
                    polaroidPivotOffsetNegative.setValue(-offset);
                  }
                }}
                style={[
                  styles.polaroidFrameWrapper,
                  {
                    transform: [
                      // Move pivot point (top center) to origin for rotation
                      { translateY: polaroidPivotOffset },
                      // Rotate around the origin (which is now at top center)
                      { 
                        rotate: polaroidRotate.interpolate({
                          inputRange: [-0.05, 0.05],
                          outputRange: ['-0.05rad', '0.05rad'],
                        })
                      },
                      // Move back from origin
                      { translateY: polaroidPivotOffsetNegative },
                    ],
                    width: '100%',
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
                  <View style={[styles.imageSection, { width: Math.min(imageWidth * 0.75, SCREEN_WIDTH - 72) }]}>
                    <Image
                      source={{ uri: originalImageUri }}
                      style={[
                        styles.completedImage,
                        {
                          width: Math.min(imageWidth * 0.75, SCREEN_WIDTH - 72),
                          height: imageHeight * 0.75,
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
            </Animated.View>
          </View>
        </View>
      </View>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.statsScrollView}
      >
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
      </ScrollView>
      <View style={styles.buttonFooter}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackToMenu}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={26} color={COLORS.text} />
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
            onPress={typeof onSettings === 'function' ? onSettings : undefined}
            activeOpacity={0.8}
          >
            <Ionicons name="settings" size={26} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.background,
  },
  polaroidSection: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: 20,
    paddingBottom: 90, // Space for footer buttons
    paddingHorizontal: 24,
  },
  statsScrollView: {
    flex: 1,
  },
  polaroidContainer: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    marginBottom: 0,
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
    top: -11, // Center of the 12px top border (12 / 2 = 6)
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
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 0,
    backgroundColor: COLORS.white,
  },
  completedImage: {
    borderRadius: 2,
  },
  frameBottomSection: {
    width: '100%',
    minHeight: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
  },
  message: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    marginTop: 20,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  buttonFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.background,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
