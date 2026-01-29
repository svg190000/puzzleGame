import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const DAY_SECTION_HEIGHT = 220;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 32) / 7;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function getCalendarWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();

  const weeks = [];
  let week = [];
  const leading = startDow;
  const prevLast = new Date(year, month, 0).getDate();

  for (let i = 0; i < leading; i++) {
    const d = prevLast - leading + 1 + i;
    week.push({
      date: new Date(year, month - 1, d),
      day: d,
      isCurrentMonth: false,
      isToday: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const today = new Date();
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
    let next = 1;
    while (week.length < 7) {
      week.push({
        date: new Date(year, month + 1, next),
        day: next,
        isCurrentMonth: false,
        isToday: false,
      });
      next++;
    }
    weeks.push(week);
  }
  return weeks;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
      gap: 16,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleNav: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: theme.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleNavText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    monthTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: 16,
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
    grid: {
      flex: 1,
      paddingHorizontal: 16,
    },
    gridContent: {
      flexGrow: 1,
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
    dayCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    daySection: {
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
      paddingHorizontal: 16,
      paddingBottom: 16,
      height: DAY_SECTION_HEIGHT - 56,
    },
    daySectionEmpty: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySectionEmptyText: {
      fontSize: 15,
      color: theme.textMuted,
    },
  });

export const CalendarScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [viewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const daySectionHeight = useSharedValue(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = useMemo(() => getCalendarWeeks(year, month), [year, month]);
  const monthLabel = MONTHS[month];
  const today = new Date();
  const todayDay = today.getDate();

  useEffect(() => {
    if (selectedDate) {
      daySectionHeight.value = withTiming(DAY_SECTION_HEIGHT, { duration: 300 });
    } else {
      daySectionHeight.value = withTiming(0, { duration: 300 });
    }
  }, [selectedDate]);

  const daySectionAnimatedStyle = useAnimatedStyle(() => ({
    height: daySectionHeight.value,
    opacity: daySectionHeight.value > 0 ? 1 : 0,
  }));

  const onDatePress = (day) => {
    if (!day.isCurrentMonth) return;
    const same =
      selectedDate &&
      selectedDate.getDate() === day.day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year;
    setSelectedDate(same ? null : day.date);
  };

  const itemsForSelectedDay = useMemo(() => [], [selectedDate]);

  return (
    <View style={styles.container}>
      {/* Top nav bar */}
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
          <View style={styles.dayCircleNav}>
            <Text style={styles.dayCircleNavText}>{todayDay}</Text>
          </View>
        </View>
      </View>

      {/* Month */}
      <Text style={styles.monthTitle}>{monthLabel}</Text>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`wday-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.divider} />

      {/* Calendar grid */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        {weeks.map((week, wi) => (
          <View key={`week-${year}-${month}-${wi}`} style={styles.weekRow}>
            {week.map((day, di) => {
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day.day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;
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
                    {day.isToday ? (
                      <View style={styles.dayCircle}>
                        <Text style={styles.dayCircleText}>{day.day}</Text>
                      </View>
                    ) : (
                      <Text
                        style={
                          day.isCurrentMonth
                            ? styles.dateText
                            : styles.dateTextMuted
                        }
                      >
                        {day.day}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

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
            <ScrollView
              style={styles.daySectionList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {itemsForSelectedDay.length === 0 ? (
                <View style={styles.daySectionEmpty}>
                  <Text style={styles.daySectionEmptyText}>
                    No items for this day
                  </Text>
                </View>
              ) : (
                itemsForSelectedDay.map((item) => (
                  <View key={item.id}>
                    <Text style={styles.daySectionEmptyText}>{item.title}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
};
