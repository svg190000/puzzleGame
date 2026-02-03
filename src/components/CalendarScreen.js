import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useGame } from '../contexts/GameContext';
import { DifficultyModal } from './DifficultyModal';

// Constants
const DAY_SECTION_HEIGHT = 300;
const SWIPE_THRESHOLD = 60;
const IMAGES_PER_PAGE = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 32) / 7;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Utility functions
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function getCalendarWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const today = new Date();

  const weeks = [];
  let week = [];

  // Previous month days
  for (let i = 0; i < startDow; i++) {
    const d = prevLast - startDow + 1 + i;
    week.push({
      date: new Date(year, month - 1, d),
      day: d,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    week.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // Next month days
  if (week.length) {
    for (let next = 1; week.length < 7; next++) {
      week.push({
        date: new Date(year, month + 1, next),
        day: next,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    weeks.push(week);
  }

  return weeks;
}

function formatDayHeader(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

// Styles
const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground,
      paddingBottom: 70,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonActive: {
      backgroundColor: `${theme.accent}15`,
      borderRadius: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      paddingHorizontal: 8,
    },
    filterButtonActive: {
      backgroundColor: `${theme.accent}15`,
      borderRadius: 8,
    },
    filterIndicatorContainer: {
      flexDirection: 'column',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
      gap: 2,
      maxHeight: 22,
    },
    filterIndicatorDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    monthTitleTouchable: {
      alignSelf: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: 4,
    },
    weekdayRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    weekday: {
      width: CELL_SIZE - 4,
      marginHorizontal: 2,
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    calendarSwipeArea: {
      flex: 1,
      overflow: 'hidden',
      paddingBottom: 12,
    },
    grid: {
      flex: 1,
      paddingHorizontal: 16,
    },
    weekRow: {
      flexDirection: 'row',
      flex: 1,
    },
    cell: {
      width: CELL_SIZE - 4,
      marginHorizontal: 2,
      paddingTop: 4,
      paddingHorizontal: 2,
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    cellContent: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
    },
    dateText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    dateTextMuted: {
      fontSize: 15,
      color: theme.textMuted,
    },
    dateTextToday: {
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    dateIndicatorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
      gap: 2,
      maxWidth: 26, // 3 dots (6px each) + 2 gaps (2px each) = 22px, with a bit of padding
    },
    dateImageIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.accent,
    },
    // Day Section
    daySectionWrapper: {
      position: 'absolute',
      bottom: 82,
      left: 0,
      right: 0,
      height: DAY_SECTION_HEIGHT,
      overflow: 'hidden',
    },
    daySection: {
      height: DAY_SECTION_HEIGHT,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.screenBackground,
      overflow: 'hidden',
    },
    daySectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    daySectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    daySectionClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    daySectionList: {
      flex: 1,
      minHeight: 100,
    },
    daySectionListContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 10,
    },
    daySectionEmpty: {
      minWidth: SCREEN_WIDTH - 32,
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySectionEmptyText: {
      fontSize: 15,
      color: theme.textMuted,
    },
    daySectionPage: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    daySectionThumb: {
      width: 112,
      height: 112,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.surfaceAlt,
    },
    daySectionThumbSelected: {
      borderColor: theme.accent,
    },
    daySectionThumbEdit: {
      borderColor: '#E53935',
    },
    daySectionThumbMove: {
      borderColor: '#FF9800',
    },
    daySectionThumbOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glossGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 10,
    },
    playButton: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    daySectionActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      marginTop: 12,
      marginBottom: 16,
    },
    actionModeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    actionModeButtonEdit: {
      borderColor: '#E53935',
      backgroundColor: 'rgba(229, 57, 53, 0.1)',
    },
    actionModeButtonMove: {
      borderColor: '#FF9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
    },
    labelModeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.accent,
    },
    labelModeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.buttonText,
    },
    actionModeButtonPlaceholder: {
      width: 44,
      height: 44,
    },
    addToDateButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.accent,
    },
    addToDateButtonCentered: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 12,
      backgroundColor: theme.accent,
    },
    addToDateButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.buttonText,
    },
    daySectionActionsEmpty: {
      justifyContent: 'center',
    },
    pageIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    pageIndicatorDot: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.textMuted,
    },
    // Month/Year Picker
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    pickerCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 40,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
    pickerHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: 20,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 16,
    },
    pickerYearRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      gap: 24,
    },
    pickerYearText: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      minWidth: 80,
      textAlign: 'center',
    },
    pickerYearBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerMonthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    pickerMonthChip: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      minWidth: '30%',
    },
    pickerMonthChipActive: {
      backgroundColor: theme.accent,
    },
    pickerMonthChipText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    pickerMonthChipTextActive: {
      color: theme.buttonText,
    },
    // Label Picker Modal
    labelPickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    labelPickerCard: {
      width: SCREEN_WIDTH * 0.85,
      maxWidth: 340,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    labelPickerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    labelPickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      gap: 12,
    },
    labelPickerOptionSelected: {
      backgroundColor: theme.surfaceAlt,
    },
    labelPickerColorDot: {
      width: 20,
      height: 20,
      borderRadius: 6,
    },
    labelPickerOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      flex: 1,
    },
    labelPickerCheckmark: {
      width: 24,
      alignItems: 'center',
    },
    labelPickerRemove: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
    },
    labelPickerRemoveText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textMuted,
    },
    // Filter Modal
    filterModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 56,
      paddingRight: 12,
    },
    filterCard: {
      width: SCREEN_WIDTH * 0.6,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    filterTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 10,
    },
    filterColorDot: {
      width: 14,
      height: 14,
      borderRadius: 4,
    },
    filterOptionText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.text,
      flex: 1,
    },
    filterCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterCheckboxActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    filterClearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 6,
    },
    filterClearText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textMuted,
    },
    // Left Panel styles
    leftPanelBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      zIndex: 100,
    },
    leftPanel: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      backgroundColor: theme.surface,
      zIndex: 101,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    leftPanelHeader: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    leftPanelTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
    },
    leftPanelContent: {
      flex: 1,
      paddingTop: 16,
    },
    leftPanelMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      gap: 14,
    },
    leftPanelMenuItemText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    leftPanelDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 20,
      marginVertical: 8,
    },
    // All Photos view styles
    allPhotosHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 12,
    },
    allPhotosBackButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    allPhotosTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    allPhotosCount: {
      fontSize: 14,
      color: theme.textMuted,
      marginLeft: 'auto',
    },
    allPhotosGrid: {
      flex: 1,
      padding: 4,
    },
    allPhotosGridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    allPhotosItem: {
      width: (SCREEN_WIDTH - 16) / 3,
      height: (SCREEN_WIDTH - 16) / 3,
      padding: 4,
    },
    allPhotosImageWrapper: {
      width: '100%',
      height: '100%',
    },
    allPhotosImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.surfaceAlt,
    },
    allPhotosEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    allPhotosEmptyText: {
      fontSize: 16,
      color: theme.textMuted,
      marginTop: 12,
    },
    // Labels menu item and dropdown styles
    labelsMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    labelsMenuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    labelsMenuItemChevron: {
      padding: 4,
    },
    labelsDropdown: {
      paddingHorizontal: 20,
      paddingLeft: 56,
      paddingBottom: 8,
      minHeight: 280, // Height for 7 labels (7 * ~40px)
    },
    labelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 10,
    },
    labelColorIndicator: {
      width: 16,
      height: 16,
      borderRadius: 4,
    },
    labelNameInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: theme.background,
    },
    labelDeleteButton: {
      padding: 4,
    },
  });

// Sub-components
function PageIndicatorDot({ active, baseStyle }) {
  const width = useSharedValue(active ? 24 : 6);

  useEffect(() => {
    width.value = withTiming(active ? 24 : 6, { duration: 200 });
  }, [active, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return <Animated.View style={[baseStyle, animatedStyle]} />;
}

function DaySectionImage({
  uri,
  isSelected,
  selectedCount,
  onPress,
  onPlayPress,
  onActionPress,
  onDeletePress,
  onLabelPress,
  styles,
  animationIndex,
  shouldAnimate,
  actionMode,
  labelColor,
}) {
  // Adjust scale based on selection count: full scale for 1, smaller for multi-select
  const getSelectedScale = () => {
    if (!isSelected) return 1;
    if (selectedCount === 1) return 1.1;
    if (selectedCount === 2) return 1.06;
    return 1.04; // 3 or more
  };

  const scale = useSharedValue(getSelectedScale());
  const overlayOpacity = useSharedValue(isSelected ? 1 : 0);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(getSelectedScale(), { duration: 200 });
    overlayOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, selectedCount, scale, overlayOpacity]);

  useEffect(() => {
    if (shouldAnimate && animationIndex !== undefined) {
      const delay = animationIndex * 100;
      imageOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    } else {
      imageOpacity.value = 0;
    }
  }, [shouldAnimate, animationIndex, imageOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: imageOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Determine border style based on mode
  const getBorderStyle = () => {
    if (actionMode === 'edit') return styles.daySectionThumbEdit;
    if (actionMode === 'move') return styles.daySectionThumbMove;
    if (actionMode === 'label') {
      // In label mode, show label color if assigned, otherwise show selected style if selected
      if (labelColor) return { borderColor: labelColor };
      if (isSelected) return styles.daySectionThumbSelected;
      return null;
    }
    if (isSelected) return styles.daySectionThumbSelected;
    // Show label color as border when image has a label assigned
    if (labelColor) return { borderColor: labelColor };
    return null;
  };

  // Determine overlay icon based on mode
  const getOverlayIcon = () => {
    if (actionMode === 'edit') return { name: 'close', color: '#FFFFFF' };
    if (actionMode === 'move') return { name: 'move', color: '#FFFFFF' };
    if (actionMode === 'label') return { name: 'pricetag', color: '#FFFFFF' };
    return { name: 'play', color: '#FFFFFF' };
  };

  const handlePress = () => {
    if (actionMode) {
      onActionPress?.();
    } else {
      onPress();
    }
  };

  const overlayIcon = getOverlayIcon();

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={animatedStyle}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri }}
            style={[styles.daySectionThumb, getBorderStyle()]}
            resizeMode="cover"
          />
          {isSelected && (
            <Animated.View style={[styles.daySectionThumbOverlay, overlayAnimatedStyle]}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.1)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.glossGradient}
              />
              {actionMode === 'edit' ? (
                <TouchableOpacity style={styles.playButton} onPress={onDeletePress} activeOpacity={0.8}>
                  <Ionicons name={overlayIcon.name} size={32} color={overlayIcon.color} />
                </TouchableOpacity>
              ) : actionMode === 'move' ? (
                <View style={styles.playButton}>
                  <Ionicons name={overlayIcon.name} size={32} color={overlayIcon.color} />
                </View>
              ) : actionMode === 'label' ? (
                <TouchableOpacity style={styles.playButton} onPress={onLabelPress} activeOpacity={0.8}>
                  <Ionicons name={overlayIcon.name} size={32} color={overlayIcon.color} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.playButton} onPress={onPlayPress} activeOpacity={0.8}>
                  <Ionicons name={overlayIcon.name} size={32} color={overlayIcon.color} />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function AllPhotosImage({ uri, style, imageStyle, animationIndex, shouldAnimate, labelColor }) {
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate && animationIndex !== undefined) {
      const delay = animationIndex * 80; // Slightly faster than day section
      imageOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    } else {
      imageOpacity.value = 0;
    }
  }, [shouldAnimate, animationIndex, imageOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Image
        source={{ uri }}
        style={[imageStyle, labelColor && { borderColor: labelColor }]}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

// Main Component
export const CalendarScreen = () => {
  const { theme } = useTheme();
  const {
    viewDate,
    setViewDate,
    selectedDate,
    setSelectedDate,
    pickerVisible,
    setPickerVisible,
    pickerYear,
    setPickerYear,
    imagesByDate,
    addImagesToDate,
    removeImageFromDate,
    moveImageToDate,
    dateKey,
  } = useCalendar();
  const { startPuzzleWithImage } = useGame();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Animation values
  const daySectionTranslateY = useSharedValue(DAY_SECTION_HEIGHT);
  const indicatorsOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  // Derived values
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month]);
  const monthLabel = MONTHS[month];
  const isCurrentYear = year === new Date().getFullYear();
  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const dayImages = selectedKey ? (imagesByDate[selectedKey] ?? []) : [];
  const pages = useMemo(() => chunk(dayImages, IMAGES_PER_PAGE), [dayImages]);
  const totalPages = pages.length;

  // Local state
  const [listHeight, setListHeight] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedImageIds, setSelectedImageIds] = useState(new Set());
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imagesShouldAnimate, setImagesShouldAnimate] = useState(false);
  const [actionMode, setActionMode] = useState(null); // 'edit' | 'move' | 'label' | null
  const [movingImages, setMovingImages] = useState([]); // [{ id, uri, fromKey }, ...]
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [leftPanelView, setLeftPanelView] = useState('menu'); // 'menu' | 'allPhotos'
  const [allPhotosReady, setAllPhotosReady] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const [labels, setLabels] = useState([
    { id: '1', color: '#E53935', name: 'Important' },
    { id: '2', color: '#43A047', name: 'Family' },
    { id: '3', color: '#1E88E5', name: 'Travel' },
    { id: '4', color: '#FF9800', name: 'Work' },
  ]);
  const [imageLabels, setImageLabels] = useState({}); // { imageId: labelId }
  const [labelPickerVisible, setLabelPickerVisible] = useState(false);
  const [labelPickerImageId, setLabelPickerImageId] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set()); // Set of label IDs
  const dayScrollRef = useRef(null);

  // Left panel animation
  const leftPanelTranslateX = useSharedValue(-SCREEN_WIDTH);
  const leftPanelWidth = useSharedValue(SCREEN_WIDTH * 0.75);
  const leftPanelBackdropOpacity = useSharedValue(0);

  // Labels section animation
  const labelsOpacity = useSharedValue(0);
  const labelsIconRotation = useSharedValue(0); // 0 = chevron-down, 1 = plus, 2 = chevron-up

  // Get all photos from calendar
  const allPhotos = useMemo(() => {
    const photos = [];
    Object.entries(imagesByDate).forEach(([dateKey, images]) => {
      images.forEach((img) => {
        photos.push({ ...img, dateKey });
      });
    });
    // Sort by date key (most recent first)
    photos.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return photos;
  }, [imagesByDate]);

  const pageHeight = listHeight ?? Math.max(1, DAY_SECTION_HEIGHT - 100);

  // Animation callback
  const triggerImageAnimation = useCallback(
    (shouldAnimateControls) => {
      const delay = shouldAnimateControls ? 150 : 0;
      setTimeout(() => {
        setImagesShouldAnimate(true);
        if (shouldAnimateControls) {
          indicatorsOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
          buttonOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        }
      }, delay);
    },
    [indicatorsOpacity, buttonOpacity]
  );

  // Day section animation
  useEffect(() => {
    if (selectedDate) {
      const wasSectionOpen = daySectionTranslateY.value < DAY_SECTION_HEIGHT;
      const shouldAnimateControls = !wasSectionOpen;
      setImagesShouldAnimate(false);

      if (shouldAnimateControls) {
        indicatorsOpacity.value = 0;
        buttonOpacity.value = 0;
      }

      daySectionTranslateY.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(triggerImageAnimation)(shouldAnimateControls);
        }
      });
    } else {
      setImagesShouldAnimate(false);
      indicatorsOpacity.value = 0;
      buttonOpacity.value = 0;
      daySectionTranslateY.value = withTiming(DAY_SECTION_HEIGHT, { duration: 300 });
    }
  }, [selectedDate, daySectionTranslateY, triggerImageAnimation, indicatorsOpacity, buttonOpacity]);

  // Reset state when selected date changes
  useEffect(() => {
    setPageIndex(0);
    setSelectedImageIds(new Set());
    setShowDifficultyModal(false);
    setSelectedImageUri(null);
    setImagesShouldAnimate(false);
    setActionMode(null);
    setMovingImages([]);
  }, [selectedKey]);

  // Clamp page index when total pages changes
  useEffect(() => {
    if (pageIndex >= totalPages && totalPages > 0) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, pageIndex]);

  // Animated styles
  const daySectionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: daySectionTranslateY.value }],
  }));

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    flex: interpolate(daySectionTranslateY.value, [DAY_SECTION_HEIGHT, 0], [1, 0.5]),
  }));

  const indicatorsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: indicatorsOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  // Left panel animation
  useEffect(() => {
    if (leftPanelOpen) {
      const targetWidth = leftPanelView === 'allPhotos' ? SCREEN_WIDTH : SCREEN_WIDTH * 0.75;
      leftPanelTranslateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      leftPanelWidth.value = withTiming(targetWidth, { duration: 300, easing: Easing.out(Easing.ease) });
      leftPanelBackdropOpacity.value = withTiming(leftPanelView === 'allPhotos' ? 0 : 0.5, { duration: 300 });
      // Set allPhotosReady after transition completes
      if (leftPanelView === 'allPhotos') {
        setTimeout(() => setAllPhotosReady(true), 320);
      }
    } else {
      leftPanelTranslateX.value = withTiming(-SCREEN_WIDTH, { duration: 300, easing: Easing.in(Easing.ease) });
      leftPanelBackdropOpacity.value = withTiming(0, { duration: 300 });
      // Reset to menu view when closing
      setTimeout(() => {
        setLeftPanelView('menu');
        setAllPhotosReady(false);
      }, 300);
    }
  }, [leftPanelOpen, leftPanelView, leftPanelTranslateX, leftPanelWidth, leftPanelBackdropOpacity]);

  const leftPanelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftPanelTranslateX.value }],
    width: leftPanelWidth.value,
  }));

  const leftPanelBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: leftPanelBackdropOpacity.value,
  }));

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelOpen((prev) => !prev);
  }, []);

  const openAllPhotos = useCallback(() => {
    setAllPhotosReady(false);
    setLeftPanelView('allPhotos');
  }, []);

  const backToMenu = useCallback(() => {
    setAllPhotosReady(false);
    setLeftPanelView('menu');
  }, []);

  // Labels section animation effect
  useEffect(() => {
    if (labelsExpanded) {
      labelsOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      // Animate icon: if at max, go to chevron-up (2), otherwise plus (1)
      labelsIconRotation.value = withTiming(labels.length >= 7 ? 2 : 1, { duration: 200 });
    } else {
      labelsOpacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
      labelsIconRotation.value = withTiming(0, { duration: 200 }); // Back to chevron-down
    }
  }, [labelsExpanded, labels.length, labelsOpacity, labelsIconRotation]);

  const labelsContentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelsOpacity.value,
  }));

  const labelsIconAnimatedStyle = useAnimatedStyle(() => {
    // Rotation: 0 -> 0deg (chevron-down), 1 -> 45deg (plus effect), 2 -> 180deg (chevron-up)
    const rotation = interpolate(labelsIconRotation.value, [0, 1, 2], [0, 0, 180]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const toggleLabelsExpanded = useCallback(() => {
    setLabelsExpanded((prev) => !prev);
  }, []);

  const updateLabelName = useCallback((labelId, newName) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === labelId ? { ...label, name: newName } : label
      )
    );
  }, []);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => prev.filter((label) => label.id !== labelId));
  }, []);

  const addNewLabel = useCallback(() => {
    if (labels.length >= 7) return; // Max 7 labels
    const colors = ['#9C27B0', '#00BCD4', '#795548', '#607D8B', '#F44336', '#4CAF50'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = Date.now().toString();
    setLabels((prev) => [...prev, { id: newId, color: randomColor, name: 'New Label' }]);
  }, [labels.length]);

  // Handlers
  const onDatePress = useCallback(
    (day) => {
      // If in move mode with images selected, move them to the tapped date
      if (actionMode === 'move' && movingImages.length > 0) {
        const toKey = dateKey(day.date);
        movingImages.forEach((img) => {
          moveImageToDate(img.fromKey, toKey, img.id);
        });
        setMovingImages([]);
        setSelectedImageIds(new Set());
        setActionMode(null); // Reset to regular mode after move
        return;
      }

      if (selectedDate && day.date.getTime() === selectedDate.getTime()) {
        setSelectedDate(null);
        return;
      }
      setSelectedDate(day.date);
      if (!day.isCurrentMonth) {
        setViewDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
      }
    },
    [selectedDate, setSelectedDate, setViewDate, actionMode, movingImages, moveImageToDate, dateKey]
  );

  const openPicker = useCallback(() => {
    setPickerYear(year);
    setPickerVisible(true);
  }, [year, setPickerYear, setPickerVisible]);

  const applyMonthYear = useCallback(
    (m, y) => {
      setViewDate(new Date(y, m, 1));
      setPickerVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setViewDate, setPickerVisible]
  );

  const goToMonth = useCallback(
    (delta) => {
      setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setViewDate]
  );

  const goToPrevMonth = useCallback(() => goToMonth(-1), [goToMonth]);
  const goToNextMonth = useCallback(() => goToMonth(1), [goToMonth]);

  const handleAddToDate = useCallback(async () => {
    if (!selectedDate) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to add images to a date.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: true,
    });

    if (!result.canceled && result.assets?.length) {
      // Get all existing identifiers across all dates in calendar
      const existingAssetIds = new Set(
        Object.values(imagesByDate).flatMap((images) =>
          images.map((img) => img.assetId).filter(Boolean)
        )
      );
      const existingFileNames = new Set(
        Object.values(imagesByDate).flatMap((images) =>
          images.map((img) => img.fileName).filter(Boolean)
        )
      );

      // Extract identifiers and filter duplicates
      const newImages = result.assets
        .map((asset) => ({
          uri: asset.uri,
          assetId: asset.assetId || null,
          fileName: asset.fileName || null,
        }))
        .filter((img) => {
          if (!img.uri) return false;
          // Check assetId first (most reliable)
          if (img.assetId && existingAssetIds.has(img.assetId)) return false;
          // Fallback to fileName check
          if (img.fileName && existingFileNames.has(img.fileName)) return false;
          // Allow if we can't verify
          return true;
        });

      if (newImages.length > 0) {
        addImagesToDate(dateKey(selectedDate), newImages);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (result.assets.length > 0) {
        Alert.alert(
          'Already Added',
          result.assets.length === 1
            ? 'This image is already in the calendar.'
            : 'All selected images are already in the calendar.'
        );
      }
    }
  }, [selectedDate, dateKey, addImagesToDate, imagesByDate]);

  const handlePlayPress = useCallback((imageUri) => {
    setSelectedImageUri(imageUri);
    setShowDifficultyModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDifficultySelected = useCallback(
    async (difficulty) => {
      setShowDifficultyModal(false);
      if (selectedImageUri && startPuzzleWithImage) {
        await startPuzzleWithImage(selectedImageUri, difficulty);
        setSelectedImageUri(null);
        setSelectedImageIds(new Set());
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [selectedImageUri, startPuzzleWithImage]
  );

  const toggleActionMode = useCallback((mode) => {
    setActionMode((current) => (current === mode ? null : mode));
    setSelectedImageIds(new Set());
    setMovingImages([]);
  }, []);

  const handleImageAction = useCallback(
    (imageId, imageUri) => {
      if (actionMode === 'edit') {
        // Toggle selection - delete happens when X icon is tapped on any selected image
        setSelectedImageIds((current) => {
          const newSet = new Set(current);
          if (newSet.has(imageId)) {
            newSet.delete(imageId);
          } else {
            newSet.add(imageId);
          }
          return newSet;
        });
      } else if (actionMode === 'move') {
        // Toggle selection for moving
        setSelectedImageIds((current) => {
          const newSet = new Set(current);
          if (newSet.has(imageId)) {
            newSet.delete(imageId);
          } else {
            newSet.add(imageId);
          }
          return newSet;
        });
        // Update movingImages based on selection
        setMovingImages((current) => {
          const exists = current.some((img) => img.id === imageId);
          if (exists) {
            return current.filter((img) => img.id !== imageId);
          } else {
            return [...current, { id: imageId, uri: imageUri, fromKey: selectedKey }];
          }
        });
      } else if (actionMode === 'label') {
        // Toggle selection for labeling
        setSelectedImageIds((current) => {
          const newSet = new Set(current);
          if (newSet.has(imageId)) {
            newSet.delete(imageId);
          } else {
            newSet.add(imageId);
          }
          return newSet;
        });
      }
    },
    [actionMode, selectedKey]
  );

  const handleDeleteImage = useCallback(() => {
    if (selectedKey && selectedImageIds.size > 0) {
      const currentImages = imagesByDate[selectedKey] || [];
      const remainingCount = currentImages.length - selectedImageIds.size;
      
      selectedImageIds.forEach((imageId) => {
        removeImageFromDate(selectedKey, imageId);
      });
      setSelectedImageIds(new Set());
      
      // Exit edit mode if no images remain
      if (remainingCount <= 0) {
        setActionMode(null);
      }
    }
  }, [selectedKey, removeImageFromDate, selectedImageIds, imagesByDate]);

  const openLabelPicker = useCallback((imageId) => {
    // If multiple images are selected, we'll apply the label to all of them
    // Store the clicked image id for reference (to show current label if single selection)
    setLabelPickerImageId(imageId);
    setLabelPickerVisible(true);
  }, []);

  const assignLabelToImage = useCallback((labelId) => {
    // Apply label to all selected images
    if (selectedImageIds.size > 0) {
      setImageLabels((prev) => {
        const newLabels = { ...prev };
        selectedImageIds.forEach((imageId) => {
          newLabels[imageId] = labelId;
        });
        return newLabels;
      });
      setSelectedImageIds(new Set()); // Clear selection after action
    } else if (labelPickerImageId) {
      // Fallback to single image if no selection
      setImageLabels((prev) => ({
        ...prev,
        [labelPickerImageId]: labelId,
      }));
    }
    setLabelPickerVisible(false);
    setLabelPickerImageId(null);
  }, [labelPickerImageId, selectedImageIds]);

  const removeLabelFromImage = useCallback(() => {
    // Remove label from all selected images
    if (selectedImageIds.size > 0) {
      setImageLabels((prev) => {
        const newLabels = { ...prev };
        selectedImageIds.forEach((imageId) => {
          delete newLabels[imageId];
        });
        return newLabels;
      });
      setSelectedImageIds(new Set()); // Clear selection after action
    } else if (labelPickerImageId) {
      // Fallback to single image if no selection
      setImageLabels((prev) => {
        const newLabels = { ...prev };
        delete newLabels[labelPickerImageId];
        return newLabels;
      });
    }
    setLabelPickerVisible(false);
    setLabelPickerImageId(null);
  }, [labelPickerImageId, selectedImageIds]);

  const handleScroll = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const i = Math.round(y / pageHeight);
      const clamped = Math.max(0, Math.min(i, totalPages - 1));
      if (clamped !== pageIndex) setPageIndex(clamped);
    },
    [pageHeight, totalPages, pageIndex]
  );

  // Gesture
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-24, 24])
        .onEnd((e) => {
          'worklet';
          const { translationX, velocityX } = e;
          if (translationX < -SWIPE_THRESHOLD || velocityX < -300) {
            runOnJS(goToNextMonth)();
          } else if (translationX > SWIPE_THRESHOLD || velocityX > 300) {
            runOnJS(goToPrevMonth)();
          }
        }),
    [goToPrevMonth, goToNextMonth]
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleLeftPanel} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[
              activeFilters.size > 0 ? styles.filterButton : styles.iconButton,
              activeFilters.size > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.7}
          >
            {activeFilters.size > 0 && (
              <View style={styles.filterIndicatorContainer}>
                {Array.from(activeFilters).map((filterId) => {
                  const filterLabel = labels.find((l) => l.id === filterId);
                  return filterLabel ? (
                    <View
                      key={filterId}
                      style={[styles.filterIndicatorDot, { backgroundColor: filterLabel.color }]}
                    />
                  ) : null;
                })}
              </View>
            )}
            <Ionicons name="filter" size={22} color={activeFilters.size > 0 ? theme.accent : theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Title */}
      <TouchableOpacity style={styles.monthTitleTouchable} onPress={openPicker} activeOpacity={0.7}>
        <Text style={styles.monthTitle}>
          {monthLabel}
          {isCurrentYear ? '' : ` · ${year}`}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      {/* Calendar Grid */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.calendarSwipeArea, calendarAnimatedStyle]}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={`${year}-${month}-${wi}`} style={styles.weekRow}>
                {week.map((day, di) => {
                  const isSelected = selectedDate && day.date.getTime() === selectedDate.getTime();
                  const dayKey = dateKey(day.date);
                  const dayImagesForCell = imagesByDate[dayKey] || [];
                  const hasImages = dayImagesForCell.length > 0;
                  
                  // Get unique label IDs and colors for this date's images
                  const uniqueLabelData = hasImages
                    ? [...new Map(
                        dayImagesForCell
                          .map((img) => {
                            const labelId = imageLabels[img.id];
                            const label = labelId ? labels.find((l) => l.id === labelId) : null;
                            return label ? [label.id, label.color] : null;
                          })
                          .filter(Boolean)
                      ).entries()].map(([id, color]) => ({ id, color }))
                    : [];
                  
                  // Filter by active filters if any are set
                  const filteredLabelData = activeFilters.size > 0
                    ? uniqueLabelData.filter((l) => activeFilters.has(l.id))
                    : uniqueLabelData;
                  
                  // Check if there are unlabeled images (only show if no filters active)
                  const hasUnlabeledImages = activeFilters.size === 0 && dayImagesForCell.some((img) => !imageLabels[img.id]);
                  
                  // Determine if we should show indicators
                  const showIndicators = filteredLabelData.length > 0 || hasUnlabeledImages;
                  
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.cell,
                        isSelected && { backgroundColor: theme.softHighlight, borderRadius: 8 },
                      ]}
                      onPress={() => onDatePress(day)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cellContent}>
                        <Text
                          style={[
                            day.isCurrentMonth ? styles.dateText : styles.dateTextMuted,
                            day.isToday && styles.dateTextToday,
                          ]}
                        >
                          {day.day}
                        </Text>
                        {showIndicators && (
                          <View style={styles.dateIndicatorContainer}>
                            {filteredLabelData.map((labelData) => (
                              <View
                                key={labelData.id}
                                style={[styles.dateImageIndicator, { backgroundColor: labelData.color }]}
                              />
                            ))}
                            {hasUnlabeledImages && (
                              <View style={styles.dateImageIndicator} />
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Day Section */}
      <View style={styles.daySectionWrapper} pointerEvents={selectedDate ? 'auto' : 'none'}>
        <Animated.View style={[styles.daySection, daySectionAnimatedStyle]}>
          {selectedDate && (
            <>
              <View style={styles.daySectionHeader}>
                <Text style={[
                  styles.daySectionTitle,
                  actionMode === 'edit' && { color: '#E53935' },
                  actionMode === 'move' && { color: '#FF9800' },
                  actionMode === 'label' && { color: '#9C27B0' },
                ]}>
                  {movingImages.length > 0
                    ? `Tap a date to move ${movingImages.length} image${movingImages.length > 1 ? 's' : ''}`
                    : actionMode === 'edit' && selectedImageIds.size > 0
                    ? `${selectedImageIds.size} image${selectedImageIds.size > 1 ? 's' : ''} selected for deletion`
                    : actionMode === 'edit'
                    ? 'Edit Mode'
                    : actionMode === 'move' && selectedImageIds.size > 0
                    ? `${selectedImageIds.size} image${selectedImageIds.size > 1 ? 's' : ''} selected to move`
                    : actionMode === 'move'
                    ? 'Move Mode'
                    : actionMode === 'label' && selectedImageIds.size > 0
                    ? `${selectedImageIds.size} image${selectedImageIds.size > 1 ? 's' : ''} selected for labeling`
                    : actionMode === 'label'
                    ? 'Label Mode'
                    : formatDayHeader(selectedDate)}
                </Text>
                <TouchableOpacity
                  style={styles.daySectionClose}
                  onPress={() => {
                    if (movingImages.length > 0) {
                      setMovingImages([]);
                      setSelectedImageIds(new Set());
                    } else if ((actionMode === 'edit' || actionMode === 'label') && selectedImageIds.size > 0) {
                      setSelectedImageIds(new Set());
                    } else {
                      setSelectedDate(null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={movingImages.length > 0 || ((actionMode === 'edit' || actionMode === 'label') && selectedImageIds.size > 0) ? 'close' : 'chevron-down'}
                    size={22}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>

              {dayImages.length === 0 ? (
                <ScrollView
                  style={styles.daySectionList}
                  contentContainerStyle={styles.daySectionListContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View style={styles.daySectionEmpty}>
                    <Text style={styles.daySectionEmptyText}>No items for this day</Text>
                  </View>
                </ScrollView>
              ) : (
                <>
                  <ScrollView
                    ref={dayScrollRef}
                    style={styles.daySectionList}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleScroll}
                    onScrollEndDrag={handleScroll}
                  >
                    {pages.map((page, pi) => (
                      <View key={pi} style={[styles.daySectionPage, { height: pageHeight }]}>
                        {page.map(({ id, uri }, index) => {
                          const isImageSelected = selectedImageIds.has(id);

                          const imageLabelId = imageLabels[id];
                          const imageLabelColor = imageLabelId ? labels.find((l) => l.id === imageLabelId)?.color : null;
                          return (
                            <DaySectionImage
                              key={id}
                              uri={uri}
                              isSelected={isImageSelected}
                              selectedCount={selectedImageIds.size}
                              onPress={() => {
                                if (actionMode) {
                                  // Multi-select in edit/move mode
                                  setSelectedImageIds((current) => {
                                    const newSet = new Set(current);
                                    if (newSet.has(id)) {
                                      newSet.delete(id);
                                    } else {
                                      newSet.add(id);
                                    }
                                    return newSet;
                                  });
                                } else {
                                  // Single select in regular mode
                                  setSelectedImageIds((current) => {
                                    if (current.has(id)) {
                                      return new Set();
                                    } else {
                                      return new Set([id]);
                                    }
                                  });
                                }
                              }}
                              onPlayPress={() => handlePlayPress(uri)}
                              onActionPress={() => handleImageAction(id, uri)}
                              onDeletePress={handleDeleteImage}
                              onLabelPress={() => openLabelPicker(id)}
                              styles={styles}
                              animationIndex={pi * IMAGES_PER_PAGE + index}
                              shouldAnimate={imagesShouldAnimate}
                              actionMode={actionMode}
                              labelColor={imageLabelColor}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                  <Animated.View style={indicatorsAnimatedStyle}>
                    <View style={styles.pageIndicators}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PageIndicatorDot key={i} active={i === pageIndex} baseStyle={styles.pageIndicatorDot} />
                      ))}
                    </View>
                  </Animated.View>
                </>
              )}

              <Animated.View style={buttonAnimatedStyle}>
                <View style={[styles.daySectionActions, dayImages.length === 0 && styles.daySectionActionsEmpty]}>
                  {dayImages.length > 0 ? (
                    <>
                      {/* Edit Button */}
                      <TouchableOpacity
                        style={[
                          styles.actionModeButton,
                          actionMode === 'edit' && styles.actionModeButtonEdit,
                        ]}
                        onPress={() => toggleActionMode('edit')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={actionMode === 'edit' ? '#E53935' : theme.text}
                        />
                      </TouchableOpacity>

                      {/* Label Button */}
                      <TouchableOpacity
                        style={styles.labelModeButton}
                        onPress={() => toggleActionMode('label')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pricetag-outline" size={20} color={theme.buttonText} />
                        <Text style={styles.labelModeButtonText}>Label</Text>
                      </TouchableOpacity>

                      {/* Add to Date Button */}
                      <TouchableOpacity style={styles.addToDateButton} onPress={handleAddToDate} activeOpacity={0.7}>
                        <Ionicons name="images-outline" size={20} color={theme.buttonText} />
                        <Text style={styles.addToDateButtonText}>Add to date</Text>
                      </TouchableOpacity>

                      {/* Move Button */}
                      <TouchableOpacity
                        style={[
                          styles.actionModeButton,
                          actionMode === 'move' && styles.actionModeButtonMove,
                        ]}
                        onPress={() => toggleActionMode('move')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="swap-horizontal-outline"
                          size={20}
                          color={actionMode === 'move' ? '#FF9800' : theme.text}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    /* Centered Add to Date Button when no images */
                    <TouchableOpacity style={styles.addToDateButtonCentered} onPress={handleAddToDate} activeOpacity={0.7}>
                      <Ionicons name="images-outline" size={20} color={theme.buttonText} />
                      <Text style={styles.addToDateButtonText}>Add to date</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>

      {/* Month/Year Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
            <View style={styles.pickerBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select month & year</Text>
            <View style={styles.pickerYearRow}>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={() => setPickerYear((y) => Math.max(1970, y - 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={() => setPickerYear((y) => Math.min(2100, y + 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {MONTHS.map((label, idx) => {
                const isActive = month === idx && pickerYear === year;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.pickerMonthChip, isActive && styles.pickerMonthChipActive]}
                    onPress={() => applyMonthYear(idx, pickerYear)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerMonthChipText, isActive && styles.pickerMonthChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Difficulty Modal */}
      <DifficultyModal
        visible={showDifficultyModal}
        onSelect={handleDifficultySelected}
        onClose={() => {
          setShowDifficultyModal(false);
          setSelectedImageUri(null);
        }}
      />

      {/* Left Panel */}
      {leftPanelOpen && leftPanelView === 'menu' && (
        <TouchableWithoutFeedback onPress={() => setLeftPanelOpen(false)}>
          <Animated.View style={[styles.leftPanelBackdrop, leftPanelBackdropAnimatedStyle]} />
        </TouchableWithoutFeedback>
      )}
      <Animated.View style={[styles.leftPanel, leftPanelAnimatedStyle]} pointerEvents={leftPanelOpen ? 'auto' : 'none'}>
        {leftPanelView === 'menu' ? (
          <>
            <View style={styles.leftPanelHeader}>
              <Text style={styles.leftPanelTitle}>Menu</Text>
            </View>
            <View style={styles.leftPanelContent}>
              <TouchableOpacity style={styles.leftPanelMenuItem} onPress={() => setLeftPanelOpen(false)} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={22} color={theme.text} />
                <Text style={styles.leftPanelMenuItemText}>Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.leftPanelMenuItem} onPress={openAllPhotos} activeOpacity={0.7}>
                <Ionicons name="images-outline" size={22} color={theme.text} />
                <Text style={styles.leftPanelMenuItemText}>Gallery</Text>
              </TouchableOpacity>

              <View style={styles.leftPanelDivider} />

              {/* Labels Section */}
              <View style={styles.labelsMenuItem}>
                <View style={styles.labelsMenuItemLeft}>
                  <Ionicons name="pricetag-outline" size={22} color={theme.text} />
                  <Text style={styles.leftPanelMenuItemText}>Labels</Text>
                </View>
                <TouchableOpacity
                  onPress={labels.length < 7 ? addNewLabel : undefined}
                  activeOpacity={labels.length < 7 ? 0.7 : 1}
                  style={[styles.labelsMenuItemChevron, labels.length >= 7 && { opacity: 0 }]}
                  disabled={labels.length >= 7}
                >
                  <Ionicons name="add" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Labels List */}
              <View style={styles.labelsDropdown}>
                {labels.map((label) => (
                  <View key={label.id} style={styles.labelItem}>
                    <View style={[styles.labelColorIndicator, { backgroundColor: label.color }]} />
                    <TextInput
                      style={styles.labelNameInput}
                      value={label.name}
                      onChangeText={(text) => updateLabelName(label.id, text)}
                      placeholder="Label name"
                      placeholderTextColor={theme.textMuted}
                    />
                    <TouchableOpacity style={styles.labelDeleteButton} onPress={() => deleteLabel(label.id)} activeOpacity={0.7}>
                      <Ionicons name="close" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.allPhotosHeader}>
              <TouchableOpacity style={styles.allPhotosBackButton} onPress={backToMenu} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.allPhotosTitle}>Gallery</Text>
              <Text style={styles.allPhotosCount}>{allPhotos.length} photos</Text>
            </View>
            {!allPhotosReady ? null : allPhotos.length === 0 ? (
              <View style={styles.allPhotosEmpty}>
                <Ionicons name="images-outline" size={48} color={theme.textMuted} />
                <Text style={styles.allPhotosEmptyText}>No photos in calendar</Text>
              </View>
            ) : (
              <ScrollView style={styles.allPhotosGrid} contentContainerStyle={styles.allPhotosGridContent}>
                {allPhotos.map((photo, index) => {
                  const photoLabelId = imageLabels[photo.id];
                  const photoLabelColor = photoLabelId ? labels.find((l) => l.id === photoLabelId)?.color : null;
                  return (
                    <TouchableOpacity key={photo.id} style={styles.allPhotosItem} activeOpacity={0.8}>
                      <AllPhotosImage
                        uri={photo.uri}
                        style={styles.allPhotosImageWrapper}
                        imageStyle={styles.allPhotosImage}
                        animationIndex={index}
                        shouldAnimate={allPhotosReady}
                        labelColor={photoLabelColor}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}
      </Animated.View>

      {/* Label Picker Modal */}
      <Modal visible={labelPickerVisible} transparent animationType="fade" onRequestClose={() => setLabelPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setLabelPickerVisible(false)}>
          <View style={styles.labelPickerBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.labelPickerCard}>
                <Text style={styles.labelPickerTitle}>
                  {selectedImageIds.size > 1
                    ? `Label ${selectedImageIds.size} images`
                    : 'Select a Label'}
                </Text>
                {labels.map((label) => {
                  // Check if all selected images have this label
                  const allHaveThisLabel = selectedImageIds.size > 0
                    ? Array.from(selectedImageIds).every((id) => imageLabels[id] === label.id)
                    : labelPickerImageId && imageLabels[labelPickerImageId] === label.id;
                  return (
                    <TouchableOpacity
                      key={label.id}
                      style={[styles.labelPickerOption, allHaveThisLabel && styles.labelPickerOptionSelected]}
                      onPress={() => assignLabelToImage(label.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.labelPickerColorDot, { backgroundColor: label.color }]} />
                      <Text style={styles.labelPickerOptionText}>{label.name}</Text>
                      <View style={styles.labelPickerCheckmark}>
                        {allHaveThisLabel && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {/* Show remove option if any selected image has a label */}
                {(selectedImageIds.size > 0
                  ? Array.from(selectedImageIds).some((id) => imageLabels[id])
                  : labelPickerImageId && imageLabels[labelPickerImageId]
                ) && (
                  <TouchableOpacity style={styles.labelPickerRemove} onPress={removeLabelFromImage} activeOpacity={0.7}>
                    <Ionicons name="close-circle-outline" size={20} color={theme.textMuted} />
                    <Text style={styles.labelPickerRemoveText}>Remove label</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={styles.filterModalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.filterCard}>
                <Text style={styles.filterTitle}>Filter by Label</Text>
                {labels.map((label) => {
                  const isActive = activeFilters.has(label.id);
                  return (
                    <TouchableOpacity
                      key={label.id}
                      style={styles.filterOption}
                      onPress={() => {
                        setActiveFilters((prev) => {
                          const newFilters = new Set(prev);
                          if (newFilters.has(label.id)) {
                            newFilters.delete(label.id);
                          } else {
                            newFilters.add(label.id);
                          }
                          return newFilters;
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.filterColorDot, { backgroundColor: label.color }]} />
                      <Text style={styles.filterOptionText}>{label.name}</Text>
                      <View style={[styles.filterCheckbox, isActive && styles.filterCheckboxActive]}>
                        {isActive && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {activeFilters.size > 0 && (
                  <TouchableOpacity
                    style={styles.filterClearButton}
                    onPress={() => setActiveFilters(new Set())}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
                    <Text style={styles.filterClearText}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
