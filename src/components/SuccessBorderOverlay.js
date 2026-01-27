import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS } from '../constants/colors';

const ANIMATION_DURATION = 500; // Total animation duration in ms
const GLOW_FADE_DURATION = 200; // Fade out duration after trace completes
const STROKE_WIDTH = 2; // Match borderWidth from GameBoard
const GLOW_STROKE_WIDTH = 4; // Thicker for glow effect
const GLOW_OPACITY = 0.8; // Glow opacity

/**
 * SuccessBorderOverlay - Animated green glow trace around tile border
 * 
 * Creates a premium "success" animation where a green glow traces around
 * the border perimeter, then fades out leaving a solid green border.
 * 
 * @param {boolean} active - Whether to start the animation
 * @param {number} width - Tile width
 * @param {number} height - Tile height
 * @param {number} borderRadius - Border radius of the tile
 * @param {function} onComplete - Callback when animation completes
 */
export const SuccessBorderOverlay = ({ 
  active, 
  width, 
  height, 
  borderRadius = 8,
  onComplete 
}) => {
  const strokeProgress = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const [strokeDashoffset, setStrokeDashoffset] = useState(0);
  const [opacity, setOpacity] = useState(0);

  // Calculate perimeter based on actual rect dimensions (accounting for stroke inset)
  const calculatePerimeter = () => {
    const rectWidth = width - STROKE_WIDTH;
    const rectHeight = height - STROKE_WIDTH;
    const straightPerimeter = 2 * (rectWidth + rectHeight) - 8 * borderRadius;
    const cornerPerimeter = 2 * Math.PI * borderRadius;
    return straightPerimeter + cornerPerimeter;
  };

  useEffect(() => {
    if (!active) {
      // Reset animations when inactive
      strokeProgress.setValue(0);
      glowOpacity.setValue(0);
      setStrokeDashoffset(0);
      setOpacity(0);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      return;
    }

    const totalPerimeter = calculatePerimeter();

    // Set up listeners for animated values
    const strokeListener = strokeProgress.addListener(({ value }) => {
      setStrokeDashoffset(totalPerimeter - value);
    });

    const opacityListener = glowOpacity.addListener(({ value }) => {
      setOpacity(value);
    });

    // Initialize values
    strokeProgress.setValue(0);
    glowOpacity.setValue(GLOW_OPACITY);
    setStrokeDashoffset(totalPerimeter);
    setOpacity(GLOW_OPACITY);

    // Animate stroke trace: strokeDashoffset from totalPerimeter to 0
    const traceDuration = ANIMATION_DURATION - GLOW_FADE_DURATION;
    
    animationRef.current = Animated.sequence([
      // Trace animation: stroke travels around border
      Animated.timing(strokeProgress, {
        toValue: totalPerimeter,
        duration: traceDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // strokeDashoffset doesn't support native driver
      }),
      // Fade out glow after trace completes
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: GLOW_FADE_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    animationRef.current.start(() => {
      strokeProgress.removeListener(strokeListener);
      glowOpacity.removeListener(opacityListener);
      onComplete?.();
      animationRef.current = null;
    });

    return () => {
      strokeProgress.removeListener(strokeListener);
      glowOpacity.removeListener(opacityListener);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [active, width, height, borderRadius]);

  if (!active || width === 0 || height === 0) {
    return null;
  }

  const totalPerimeter = calculatePerimeter();

  // Calculate position to match border (borderWidth: 2, positioned at edges)
  // SVG strokes are centered on the path, so we need to inset by half the stroke width
  const strokeInset = STROKE_WIDTH / 2;
  const rectX = strokeInset;
  const rectY = strokeInset;
  const rectWidth = width - STROKE_WIDTH;
  const rectHeight = height - STROKE_WIDTH;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      pointerEvents="none"
    >
      {/* Glow layer (thicker, semi-transparent) */}
      <Rect
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke={COLORS.success}
        strokeWidth={GLOW_STROKE_WIDTH}
        strokeDasharray={totalPerimeter}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      {/* Main trace layer (matches border width exactly) */}
      <Rect
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke={COLORS.success}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={totalPerimeter}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={1}
      />
    </Svg>
  );
};
