import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_MAX_WIDTH = SCREEN_WIDTH - 48;

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
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
      borderColor: theme.text,
      borderRadius: 6,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      alignItems: 'center',
      transformOrigin: 'top center',
    },
    thumbtack: {
      position: 'absolute',
      top: -11,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    thumbtackCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.danger,
      borderWidth: 2,
      borderColor: theme.white,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 5,
    },
    polaroidFrame: {
      backgroundColor: theme.surface,
      borderWidth: 12,
      borderColor: theme.surface,
      borderRadius: 5,
      shadowColor: theme.shadow,
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
      backgroundColor: theme.surface,
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
      backgroundColor: theme.surface,
      borderTopWidth: 0,
    },
    message: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
  });

/**
 * Reusable polaroid frame with pin, entrance animation, and optional sway.
 * Use caption (string or node) for the bottom label; use imageUri + imageWidth/imageHeight for the photo.
 */
export const Polaroid = ({
  imageUri,
  imageWidth,
  imageHeight,
  caption,
  maxWidth = DEFAULT_MAX_WIDTH,
  animate = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const polaroidScale = useRef(new Animated.Value(animate ? 0.3 : 1)).current;
  const polaroidOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const polaroidTranslateY = useRef(new Animated.Value(animate ? 100 : 0)).current;
  const polaroidRotate = useRef(new Animated.Value(0)).current;
  const polaroidPivotOffset = useRef(new Animated.Value(0)).current;
  const polaroidPivotOffsetNegative = useRef(new Animated.Value(0)).current;
  const thumbtackScale = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const thumbtackOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;

  const contentWidth = imageWidth && imageHeight
    ? Math.min(imageWidth * 0.75 + 26, maxWidth)
    : maxWidth;
  const imageDisplayWidth = imageWidth ? Math.min(imageWidth * 0.75, maxWidth - 24) : null;
  const imageDisplayHeight = imageHeight ? imageHeight * 0.75 : null;

  useEffect(() => {
    if (!animate) return;

    polaroidScale.setValue(0.3);
    polaroidOpacity.setValue(0);
    polaroidTranslateY.setValue(100);
    polaroidRotate.setValue(0);
    polaroidPivotOffset.setValue(0);
    polaroidPivotOffsetNegative.setValue(0);
    thumbtackScale.setValue(0);
    thumbtackOpacity.setValue(0);

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
        const createSwayLoop = () => {
          Animated.sequence([
            Animated.timing(polaroidRotate, {
              toValue: 0.05,
              duration: 2000,
              easing: Easing.bezier(0.42, 0, 0.58, 1),
              useNativeDriver: true,
            }),
            Animated.timing(polaroidRotate, {
              toValue: -0.05,
              duration: 2000,
              easing: Easing.bezier(0.42, 0, 0.58, 1),
              useNativeDriver: true,
            }),
          ]).start(() => createSwayLoop());
        };
        createSwayLoop();
      });
    });
  }, [animate]);

  return (
    <View style={styles.container}>
      <View style={styles.pinFulcrum}>
        <Animated.View
          style={[
            {
              transform: [
                { translateY: polaroidTranslateY },
                { scale: polaroidScale },
              ],
              opacity: polaroidOpacity,
              width: typeof contentWidth === 'number' ? contentWidth : '100%',
            },
          ]}
        >
          <Animated.View
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              if (height > 0 && animate) {
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
                  {
                    rotate: polaroidRotate.interpolate({
                      inputRange: [-0.05, 0.05],
                      outputRange: ['-0.05rad', '0.05rad'],
                    }),
                  },
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
              {imageUri && imageDisplayWidth != null && imageDisplayHeight != null && (
                <View style={[styles.imageSection, { width: imageDisplayWidth }]}>
                  <Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.completedImage,
                      { width: imageDisplayWidth, height: imageDisplayHeight },
                    ]}
                    resizeMode="cover"
                  />
                </View>
              )}
              <View style={styles.frameBottomSection}>
                {typeof caption === 'string' ? (
                  <Text style={styles.message}>{caption}</Text>
                ) : (
                  caption
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};
