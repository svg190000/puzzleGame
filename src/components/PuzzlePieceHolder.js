import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const holderHeight = 140;
  const progressBarHeight = 18; // Space for progress bar at bottom
  const verticalPadding = 24; // Top + bottom padding for pieces area
  const availableHeight = holderHeight - progressBarHeight - verticalPadding;
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
  
  const maxWidth = 85; // Smaller max for better fit
  const maxHeight = 80; // Cap height as well
  if (holderPieceWidth > maxWidth) {
    holderPieceWidth = maxWidth;
    holderPieceHeight = holderPieceWidth * pieceAspectRatio;
  }
  if (holderPieceHeight > maxHeight) {
    holderPieceHeight = maxHeight;
    holderPieceWidth = holderPieceHeight / pieceAspectRatio;
  }
  
  const pieceSpacing = 10;
  const scrollIndicatorPadding = 28; // Space for scroll indicators
  const totalContentWidth = pieces.length * holderPieceWidth + (pieces.length - 1) * pieceSpacing + (scrollIndicatorPadding * 2);
  
  const scrollAreaWidth = boardWidth - (scrollIndicatorPadding * 2);
  const contentWidth = scrollContentWidth > 0 ? scrollContentWidth : totalContentWidth;
  const scrollableWidth = Math.max(0, contentWidth - scrollAreaWidth);
  
  // Track initial pieces count for counter display
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

  // Pieces remaining count
  const piecesRemaining = pieces.length;
  
  // Calculate progress: percentage of pieces placed
  const progress = initialPiecesCount.current > 0 
    ? Math.min(1, (initialPiecesCount.current - piecesRemaining) / initialPiecesCount.current)
    : 0;
  
  // Progress bar grows from center as pieces are placed
  const progressTrackWidth = boardWidth - 48; // Padding on sides
  const minProgressWidth = 8;
  const progressBarWidth = minProgressWidth + (progress * (progressTrackWidth - minProgressWidth));
  const progressBarPosition = (progressTrackWidth - progressBarWidth) / 2;

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
    
    // Scroll to left on new game/reset
    if (resetScrollKey !== undefined && resetScrollKey !== lastResetScrollKey.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            actualScrollPosition.current = 0;
            setScrollPosition(0);
            scrollViewRef.current.scrollTo({ x: 0, animated: false });
            lastResetScrollKey.current = resetScrollKey;
          }
        });
      });
    }
  };

  // Reset scroll position to left when resetScrollKey changes
  useEffect(() => {
    if (resetScrollKey !== undefined && resetScrollKey !== lastResetScrollKey.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollViewRef.current) {
            // Always scroll to left (position 0)
            actualScrollPosition.current = 0;
            setScrollPosition(0);
            scrollViewRef.current.scrollTo({ x: 0, animated: false });
            // Mark that we've handled this resetScrollKey
            lastResetScrollKey.current = resetScrollKey;
          }
        });
      });
    }
  }, [resetScrollKey, scrollContentWidth, scrollAreaWidth, totalContentWidth]);

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
              const oldScrollableWidth = Math.max(0, oldContentWidth - scrollAreaWidth);
              const newScrollableWidth = Math.max(0, currentContentWidth - scrollAreaWidth);
              const currentScroll = actualScrollPosition.current;
              
              // Update previousContentWidth for next calculation
              previousContentWidth.current = currentContentWidth;
              
              if (newScrollableWidth > 0 && oldScrollableWidth > 0) {
                const pieceWidthWithSpacing = holderPieceWidth + pieceSpacing;
                
                // Calculate viewport bounds
                const viewportLeft = currentScroll;
                const viewportRight = currentScroll + scrollAreaWidth;
                
                // Check if we're near an edge (within 1 piece width)
                const edgeThreshold = pieceWidthWithSpacing;
                const isNearLeftEdge = currentScroll < edgeThreshold;
                const isNearRightEdge = currentScroll > (oldScrollableWidth - edgeThreshold);
                
                let newScrollPosition;
                
                if (isNearRightEdge) {
                  // Near right edge - scroll left to show more pieces
                  newScrollPosition = Math.max(0, newScrollableWidth - scrollAreaWidth * 0.3);
                } else if (isNearLeftEdge) {
                  // Near left edge - stay near left but ensure we don't go negative
                  newScrollPosition = Math.min(currentScroll, newScrollableWidth);
                } else {
                  // Middle area - maintain proportional position, but adjust if content shrunk significantly
                  const scrollRatio = currentScroll / oldScrollableWidth;
                  newScrollPosition = scrollRatio * newScrollableWidth;
                  
                  // If we're now too far right after adjustment, pull back
                  if (newScrollPosition > newScrollableWidth - edgeThreshold) {
                    newScrollPosition = Math.max(0, newScrollableWidth - scrollAreaWidth * 0.3);
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
  }, [pieces.length, scrollContentWidth, scrollAreaWidth, totalContentWidth, holderPieceWidth, pieceSpacing]);

  // Calculate scroll indicator visibility - hide when no pieces remain
  const hasPieces = pieces && pieces.length > 0;
  const canScrollLeft = hasPieces && scrollableWidth > 0 && scrollPosition > 5;
  const canScrollRight = hasPieces && scrollableWidth > 0 && scrollPosition < scrollableWidth - 5;

  return (
    <View style={[styles.container, { width: boardWidth }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onHolderTap}
        style={styles.holder}
      >
        <View style={styles.contentRow}>
          {/* Left scroll indicator */}
          <View style={[styles.scrollIndicator, styles.leftIndicator]}>
            {canScrollLeft && (
              <Ionicons name="chevron-back" size={18} color={COLORS.textLight} />
            )}
          </View>
          
          <View style={styles.scrollViewContainer}>
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
              }) : (
                <View style={[styles.emptyState, { width: scrollAreaWidth }]}>
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                </View>
              )}
            </ScrollView>
          </View>
          
          {/* Right scroll indicator */}
          <View style={[styles.scrollIndicator, styles.rightIndicator]}>
            {canScrollRight && (
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            )}
          </View>
        </View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { width: progressTrackWidth }]}>
            <View 
              style={[
                styles.progressBar,
                { 
                  left: progressBarPosition,
                  width: progressBarWidth,
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
    height: 140,
    paddingVertical: 8,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicator: {
    width: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIndicator: {
    paddingLeft: 4,
  },
  rightIndicator: {
    paddingRight: 4,
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pieceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    height: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
});
