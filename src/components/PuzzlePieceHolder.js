import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { PuzzlePiece } from './PuzzlePiece';

export const PuzzlePieceHolder = ({
  boardWidth,
  pieces,
  pieceWidth,
  pieceHeight,
  selectedPieceId,
  selectedPieceId2,
  onPieceSelect,
  onHolderTap,
  resetScrollKey,
}) => {
  const holderHeight = 150;
  const holderPadding = 24;
  const availableHeight = holderHeight - holderPadding - 20;
  const scrollViewRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollContentWidth, setScrollContentWidth] = useState(0);
  const actualScrollPosition = useRef(0);
  const lastResetScrollKey = useRef(undefined);
  const previousContentWidth = useRef(0);
  const previousPiecesLength = useRef(pieces.length);
  const isUserScrolling = useRef(false);
  const scrollTimeoutRef = useRef(null);
  
  const pieceAspectRatio = pieceHeight > 0 && pieceWidth > 0 ? pieceHeight / pieceWidth : 1;
  
  let holderPieceHeight = availableHeight;
  let holderPieceWidth = holderPieceHeight / pieceAspectRatio;
  
  const maxWidth = 120;
  if (holderPieceWidth > maxWidth) {
    holderPieceWidth = maxWidth;
    holderPieceHeight = holderPieceWidth * pieceAspectRatio;
  }
  
  const pieceSpacing = 12;
  const totalContentWidth = pieces.length * holderPieceWidth + (pieces.length - 1) * pieceSpacing + 24;
  
  const scrollIndicatorWidth = boardWidth - 24;
  const progressBarHeight = 12;
  const contentWidth = scrollContentWidth > 0 ? scrollContentWidth : totalContentWidth;
  const scrollableWidth = Math.max(0, contentWidth - scrollIndicatorWidth);
  
  // Track initial pieces count for progress calculation
  const initialPiecesCount = useRef(pieces.length || 1);
  const lastInitialCountResetKey = useRef(undefined);
  
  // Reset initial count when starting a new game/reset
  useEffect(() => {
    if (resetScrollKey !== undefined && resetScrollKey !== lastInitialCountResetKey.current) {
      initialPiecesCount.current = pieces.length || 1;
      lastInitialCountResetKey.current = resetScrollKey;
    } else if (resetScrollKey === undefined && initialPiecesCount.current === 1 && pieces.length > 1) {
      // Initial mount with pieces - set initial count
      initialPiecesCount.current = pieces.length || 1;
    }
  }, [resetScrollKey, pieces.length]);

  // Calculate progress: percentage of pieces removed
  const currentPiecesCount = pieces.length;
  const progress = initialPiecesCount.current > 0 
    ? Math.min(1, (initialPiecesCount.current - currentPiecesCount) / initialPiecesCount.current)
    : 0;
  
  // Progress bar grows from center as pieces are removed
  const minProgressWidth = 8; // Minimum width when no progress
  const progressBarWidth = minProgressWidth + (progress * (scrollIndicatorWidth - minProgressWidth));
  const progressBarPosition = (scrollIndicatorWidth - progressBarWidth) / 2; // Center the progress bar

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    // Update scroll position for fade calculations
    const newPosition = contentOffset.x;
    actualScrollPosition.current = newPosition;
    setScrollPosition(newPosition);
    
    // Mark that user is actively scrolling
    isUserScrolling.current = true;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset user scrolling flag after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  };

  const handleContentSizeChange = (width, height) => {
    setScrollContentWidth(width);
    previousContentWidth.current = width;
    
    // Scroll to center on new game/reset
    if (resetScrollKey !== undefined && resetScrollKey !== lastResetScrollKey.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            const scrollableWidth = Math.max(0, width - scrollIndicatorWidth);
            if (scrollableWidth > 0) {
              const centerPosition = scrollableWidth / 2;
              actualScrollPosition.current = centerPosition;
              setScrollPosition(centerPosition);
              scrollViewRef.current.scrollTo({ x: centerPosition, animated: false });
              lastResetScrollKey.current = resetScrollKey;
            }
          }
        });
      });
    }
  };

  // Reset scroll position to center when resetScrollKey changes
  useEffect(() => {
    if (resetScrollKey !== undefined && resetScrollKey !== lastResetScrollKey.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            // Use current scrollContentWidth or calculate from totalContentWidth
            const contentWidth = scrollContentWidth > 0 ? scrollContentWidth : totalContentWidth;
            const scrollableWidth = Math.max(0, contentWidth - scrollIndicatorWidth);
            if (scrollableWidth > 0) {
              const centerPosition = scrollableWidth / 2;
              // Update ref immediately for accurate tracking
              actualScrollPosition.current = centerPosition;
              // Set state first to ensure thumb position is correct
              setScrollPosition(centerPosition);
              // Then scroll the view
              scrollViewRef.current.scrollTo({ x: centerPosition, animated: false });
              // Mark that we've handled this resetScrollKey
              lastResetScrollKey.current = resetScrollKey;
            } else {
              // If no scrollable width, reset to 0
              actualScrollPosition.current = 0;
              setScrollPosition(0);
              scrollViewRef.current.scrollTo({ x: 0, animated: false });
              lastResetScrollKey.current = resetScrollKey;
            }
          }
        });
      });
    }
  }, [resetScrollKey, scrollContentWidth, scrollIndicatorWidth, totalContentWidth]);

  // Auto-adjust scroll when pieces are removed (but not during user scrolling)
  useEffect(() => {
    if (pieces.length !== previousPiecesLength.current && scrollContentWidth > 0 && scrollViewRef.current) {
      const piecesRemoved = pieces.length < previousPiecesLength.current;
      const oldContentWidth = previousContentWidth.current || scrollContentWidth;
      previousPiecesLength.current = pieces.length;
      
      // Only auto-adjust if user is not actively scrolling
      if (!isUserScrolling.current && piecesRemoved) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollViewRef.current) {
              const currentContentWidth = scrollContentWidth || totalContentWidth;
              const oldScrollableWidth = Math.max(0, oldContentWidth - scrollIndicatorWidth);
              const newScrollableWidth = Math.max(0, currentContentWidth - scrollIndicatorWidth);
              const currentScroll = actualScrollPosition.current;
              
              // Update previousContentWidth for next calculation
              previousContentWidth.current = currentContentWidth;
              
              if (newScrollableWidth > 0 && oldScrollableWidth > 0) {
                const pieceWidthWithSpacing = holderPieceWidth + pieceSpacing;
                
                // Calculate viewport bounds
                const viewportLeft = currentScroll;
                const viewportRight = currentScroll + scrollIndicatorWidth;
                
                // Check if we're near an edge (within 1 piece width)
                const edgeThreshold = pieceWidthWithSpacing;
                const isNearLeftEdge = currentScroll < edgeThreshold;
                const isNearRightEdge = currentScroll > (oldScrollableWidth - edgeThreshold);
                
                let newScrollPosition;
                
                if (isNearRightEdge) {
                  // Near right edge - scroll left to show more pieces
                  newScrollPosition = Math.max(0, newScrollableWidth - scrollIndicatorWidth * 0.3);
                } else if (isNearLeftEdge) {
                  // Near left edge - stay near left but ensure we don't go negative
                  newScrollPosition = Math.min(currentScroll, newScrollableWidth);
                } else {
                  // Middle area - maintain proportional position, but adjust if content shrunk significantly
                  const scrollRatio = currentScroll / oldScrollableWidth;
                  newScrollPosition = scrollRatio * newScrollableWidth;
                  
                  // If we're now too far right after adjustment, pull back
                  if (newScrollPosition > newScrollableWidth - edgeThreshold) {
                    newScrollPosition = Math.max(0, newScrollableWidth - scrollIndicatorWidth * 0.3);
                  }
                }
                
                // Ensure position is within bounds
                newScrollPosition = Math.max(0, Math.min(newScrollableWidth, newScrollPosition));
                
                actualScrollPosition.current = newScrollPosition;
                setScrollPosition(newScrollPosition);
                scrollViewRef.current.scrollTo({ x: newScrollPosition, animated: true });
              } else if (newScrollableWidth <= 0) {
                // No more scrollable content
                actualScrollPosition.current = 0;
                setScrollPosition(0);
                scrollViewRef.current.scrollTo({ x: 0, animated: true });
              }
            }
          });
        });
      }
    }
  }, [pieces.length, scrollContentWidth, scrollIndicatorWidth, totalContentWidth, holderPieceWidth, pieceSpacing]);

  // Calculate fade opacity based on scroll position
  // Fade increases as pieces move out of view (stronger/faster fade)
  const fadeWidth = 15; // Width of the fade gradient effect area
  const leftFadeOpacity = scrollableWidth > 0 && scrollPosition > 0
    ? Math.min(1, scrollPosition / fadeWidth)
    : 0;
  const rightFadeOpacity = scrollableWidth > 0 && scrollPosition < scrollableWidth
    ? Math.min(1, (scrollableWidth - scrollPosition) / fadeWidth)
    : 0;

  return (
    <View style={[styles.container, { width: boardWidth }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onHolderTap}
        style={styles.holder}
      >
        <View style={styles.scrollViewContainer}>
          {/* Left fade gradient */}
          {leftFadeOpacity > 0 && (
            <LinearGradient
              colors={[COLORS.white, COLORS.white, 'rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              locations={[0, 0.3, 0.7, 1]}
              style={[styles.fadeGradient, styles.leftFade]}
              pointerEvents="none"
            />
          )}
          
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={styles.scrollView}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            scrollEnabled={true}
          >
            {pieces && pieces.length > 0 ? pieces.map((piece, index) => {
              if (!piece || !piece.id) return null;
              return (
                <View
                  key={piece.id}
                  style={[
                    styles.pieceWrapper,
                    { 
                      width: holderPieceWidth, 
                      marginRight: index < pieces.length - 1 ? pieceSpacing : 0 
                    }
                  ]}
                >
                  <PuzzlePiece
                    piece={piece}
                    pieceWidth={holderPieceWidth}
                    pieceHeight={holderPieceHeight}
                    isSelected={selectedPieceId === piece.id}
                    isSelected2={selectedPieceId2 === piece.id}
                    onPress={onPieceSelect}
                  />
                </View>
              );
            }) : null}
          </ScrollView>
          
          {/* Right fade gradient */}
          {rightFadeOpacity > 0 && (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.3)', COLORS.white, COLORS.white]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              locations={[0, 0.3, 0.7, 1]}
              style={[styles.fadeGradient, styles.rightFade]}
              pointerEvents="none"
            />
          )}
        </View>
        
        {/* Progress tracker - grows from center as pieces are removed */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressBar,
                { 
                  left: progressBarPosition,
                  width: progressBarWidth,
                  height: progressBarHeight,
                }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  holder: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 150,
    paddingBottom: 8,
  },
  scrollViewContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10, // Match holder border radius (12 - 2 for border)
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fadeGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 15,
    zIndex: 10,
    pointerEvents: 'none',
    borderRadius: 10, // Match container border radius
  },
  leftFade: {
    left: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  rightFade: {
    right: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  pieceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    backgroundColor: COLORS.accent,
    borderRadius: 6,
  },
});
