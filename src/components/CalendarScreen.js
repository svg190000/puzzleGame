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
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, runOnJS, interpolate } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useGame } from '../contexts/GameContext';
import { DifficultyModal } from './DifficultyModal';

const DAY_SECTION_HEIGHT = 300;
const SWIPE_THRESHOLD = 60;
const IMAGES_PER_PAGE = 3;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
const CELL_SIZE = (SCREEN_WIDTH - 32) / 7;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function getCalendarWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const today = new Date();

  const weeks = [];
  let week = [];

  for (let i = 0; i < startDow; i++) {
    const d = prevLast - startDow + 1 + i;
    week.push({
      date: new Date(year, month - 1, d),
      day: d,
      isCurrentMonth: false,
      isToday: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    week.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday:
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
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

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground,
      paddingBottom: 90,
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
      paddingBottom: 10,
      overflow: 'hidden',
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
    daySectionWrapper: {
      position: 'absolute',
      bottom: 80,
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
    addToDateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.accent,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 16,
    },
    addToDateButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.buttonText,
    },
    daySectionImages: {
      flexDirection: 'row',
      gap: 10,
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
    monthTitleTouchable: {
      alignSelf: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 16,
    },
  });

function PageIndicatorDot({ active, baseStyle }) {
  const width = useSharedValue(active ? 24 : 6);
  useEffect(() => {
    width.value = withTiming(active ? 24 : 6, { duration: 200 });
  }, [active, width]);
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View style={[baseStyle, animatedStyle]} />
  );
}

function DaySectionImage({ id, uri, isSelected, shiftLeft, shiftRight, onPress, onPlayPress, styles, animationIndex, shouldAnimate }) {
  const scale = useSharedValue(isSelected ? 1.1 : 1);
  const translateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(isSelected ? 1 : 0);
  const imageOpacity = useSharedValue(0);
  
  useEffect(() => {
    scale.value = withTiming(isSelected ? 1.1 : 1, { duration: 200 });
    overlayOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
    // Calculate shift: when selected image scales to 1.1x, adjacent images shift away to maintain uniform gaps
    const shiftAmount = shiftLeft ? -3 : shiftRight ? 3 : 0;
    translateX.value = withTiming(shiftAmount, { duration: 200 });
  }, [isSelected, shiftLeft, shiftRight, scale, translateX, overlayOpacity]);
  
  useEffect(() => {
    if (shouldAnimate && animationIndex !== undefined) {
      // Stagger animation: each image fades in with a delay based on its index
      const delay = animationIndex * 100; // 100ms delay between each image
      imageOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    } else {
      imageOpacity.value = 0;
    }
  }, [shouldAnimate, animationIndex, imageOpacity]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
    opacity: imageOpacity.value,
  }));
  
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={animatedStyle}>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri }}
            style={[
              styles.daySectionThumb,
              isSelected && styles.daySectionThumbSelected,
            ]}
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
              <TouchableOpacity
                style={styles.playButton}
                onPress={onPlayPress}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

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
    dateKey,
  } = useCalendar();
  const { startPuzzleWithImage } = useGame();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const daySectionTranslateY = useSharedValue(DAY_SECTION_HEIGHT);
  const indicatorsOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month]);
  const monthLabel = MONTHS[month];
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();

  const triggerImageAnimation = useCallback((shouldAnimateControls) => {
    const delay = shouldAnimateControls ? 150 : 0; // Only delay if section is opening
    setTimeout(() => {
      setImagesShouldAnimate(true);
      // Only animate indicators and button if section is opening (not just switching dates)
      if (shouldAnimateControls) {
        indicatorsOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        buttonOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      }
    }, delay);
  }, [indicatorsOpacity, buttonOpacity]);

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

  const daySectionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: daySectionTranslateY.value }],
  }));

  // Calendar shrinks from flex 1 to 0.7 as section slides up
  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    flex: interpolate(
      daySectionTranslateY.value,
      [DAY_SECTION_HEIGHT, 0],
      [1, 0.5]
    ),
  }));

  const indicatorsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: indicatorsOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const onDatePress = useCallback((day) => {
    const same = selectedDate && day.date.getTime() === selectedDate.getTime();
    if (same) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      const d = day.date;
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selectedDate, setSelectedDate, setViewDate]);

  const openPicker = useCallback(() => {
    setPickerYear(year);
    setPickerVisible(true);
  }, [year, setPickerYear, setPickerVisible]);

  const applyMonthYear = useCallback((m, y) => {
    setViewDate(new Date(y, m, 1));
    setPickerVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setViewDate, setPickerVisible]);

  const goToMonth = useCallback((delta) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setViewDate]);

  const goToPrevMonth = useCallback(() => goToMonth(-1), [goToMonth]);
  const goToNextMonth = useCallback(() => goToMonth(1), [goToMonth]);

  const handleAddToDate = useCallback(async () => {
    if (!selectedDate) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Photo library access is required to add images to a date.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    const key = dateKey(selectedDate);
    const uris = result.assets.map((a) => a.uri).filter(Boolean);
    if (uris.length) addImagesToDate(key, uris);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedDate, dateKey, addImagesToDate]);

  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const dayImages = selectedKey ? (imagesByDate[selectedKey] ?? []) : [];
  const pages = useMemo(() => chunk(dayImages, IMAGES_PER_PAGE), [dayImages]);
  const totalPages = pages.length;

  const [listHeight, setListHeight] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imagesShouldAnimate, setImagesShouldAnimate] = useState(false);
  const dayScrollRef = useRef(null);

  useEffect(() => {
    setPageIndex(0);
    setSelectedImageId(null);
    setShowDifficultyModal(false);
    setSelectedImageUri(null);
    setImagesShouldAnimate(false);
    // Don't reset indicators or button opacity when switching dates - keep them visible
  }, [selectedKey]);

  const handlePlayPress = useCallback((imageUri) => {
    setSelectedImageUri(imageUri);
    setShowDifficultyModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDifficultySelected = useCallback(async (difficulty) => {
    setShowDifficultyModal(false);
    if (selectedImageUri && startPuzzleWithImage) {
      await startPuzzleWithImage(selectedImageUri, difficulty);
      setSelectedImageUri(null);
      setSelectedImageId(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selectedImageUri, startPuzzleWithImage]);

  useEffect(() => {
    if (pageIndex >= totalPages && totalPages > 0) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, pageIndex]);

  const pageHeight = listHeight ?? Math.max(1, DAY_SECTION_HEIGHT - 100);

  const handleDayScroll = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const i = Math.round(y / pageHeight);
      const clamped = Math.max(0, Math.min(i, totalPages - 1));
      if (clamped !== pageIndex) setPageIndex(clamped);
    },
    [pageHeight, totalPages, pageIndex]
  );

  const handleDayScrollEnd = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const i = Math.round(y / pageHeight);
      const clamped = Math.max(0, Math.min(i, totalPages - 1));
      if (clamped !== pageIndex) setPageIndex(clamped);
    },
    [pageHeight, totalPages, pageIndex]
  );

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
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="search" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.monthTitleTouchable}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={styles.monthTitle}>
          {monthLabel}{isCurrentYear ? '' : ` · ${year}`}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.calendarSwipeArea, calendarAnimatedStyle]}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={`wday-${i}`} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.divider} />

          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={`week-${year}-${month}-${wi}`} style={styles.weekRow}>
                {week.map((day, di) => {
                  const isSelected =
                    selectedDate && day.date.getTime() === selectedDate.getTime();
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.cell,
                        isSelected && {
                          backgroundColor: theme.softHighlight,
                          borderRadius: 8,
                        },
                      ]}
                      onPress={() => onDatePress(day)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cellContent}>
                        <Text
                          style={[
                            day.isCurrentMonth
                              ? styles.dateText
                              : styles.dateTextMuted,
                            day.isToday && styles.dateTextToday,
                          ]}
                        >
                          {day.day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.daySectionWrapper} pointerEvents={selectedDate ? 'auto' : 'none'}>
        <Animated.View style={[styles.daySection, daySectionAnimatedStyle]}>
          {selectedDate ? (
            <>
              <View style={styles.daySectionHeader}>
                <Text style={styles.daySectionTitle}>
                  {formatDayHeader(selectedDate)}
                </Text>
                <TouchableOpacity
                  style={styles.daySectionClose}
                  onPress={() => setSelectedDate(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-down" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>
              {dayImages.length === 0 ? (
                <ScrollView
                  style={styles.daySectionList}
                  contentContainerStyle={styles.daySectionListContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={styles.daySectionEmpty}>
                    <Text style={styles.daySectionEmptyText}>
                      No items for this day
                    </Text>
                  </View>
                </ScrollView>
              ) : (
                <>
                  <ScrollView
                    ref={dayScrollRef}
                    style={styles.daySectionList}
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    scrollEventThrottle={16}
                    onLayout={(e) =>
                      setListHeight(e.nativeEvent.layout.height)
                    }
                    onScroll={handleDayScroll}
                    onMomentumScrollEnd={handleDayScrollEnd}
                    onScrollEndDrag={handleDayScrollEnd}
                  >
                    {pages.map((page, pi) => (
                      <View
                        key={pi}
                        style={[
                          styles.daySectionPage,
                          { height: pageHeight },
                        ]}
                      >
                        {page.map(({ id, uri }, index) => {
                          const isSelected = selectedImageId === id;
                          const selectedIndex = page.findIndex(item => item.id === selectedImageId);
                          const shiftLeft = selectedIndex !== -1 && index === selectedIndex - 1;
                          const shiftRight = selectedIndex !== -1 && index === selectedIndex + 1;
                          const globalIndex = pi * IMAGES_PER_PAGE + index;
                          
                          return (
                            <DaySectionImage
                              key={id}
                              id={id}
                              uri={uri}
                              isSelected={isSelected}
                              shiftLeft={shiftLeft}
                              shiftRight={shiftRight}
                              onPress={() => setSelectedImageId(isSelected ? null : id)}
                              onPlayPress={() => handlePlayPress(uri)}
                              styles={styles}
                              animationIndex={globalIndex}
                              shouldAnimate={imagesShouldAnimate}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                  <Animated.View style={indicatorsAnimatedStyle}>
                    <View style={styles.pageIndicators}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PageIndicatorDot
                          key={i}
                          active={i === pageIndex}
                          baseStyle={styles.pageIndicatorDot}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </>
              )}
              <Animated.View style={buttonAnimatedStyle}>
                <TouchableOpacity
                  style={styles.addToDateButton}
                  onPress={handleAddToDate}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={20} color={theme.buttonText} />
                  <Text style={styles.addToDateButtonText}>Add to date</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : null}
        </Animated.View>
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
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
                    style={[
                      styles.pickerMonthChip,
                      isActive && styles.pickerMonthChipActive,
                    ]}
                    onPress={() => applyMonthYear(idx, pickerYear)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerMonthChipText,
                        isActive && styles.pickerMonthChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <DifficultyModal
        visible={showDifficultyModal}
        onSelect={handleDifficultySelected}
        onClose={() => {
          setShowDifficultyModal(false);
          setSelectedImageUri(null);
        }}
      />
    </View>
  );
};
