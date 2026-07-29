/**
 * 日期导航器组件
 * 用于在不同日期之间切换查看日程
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getToday, getYesterday, getTomorrow, addDays, getChineseWeekday } from '../utils/helpers';

export default function DateNavigator({ currentDate, onDateChange }) {
  const theme = useTheme();

  const today = getToday();
  const isToday = currentDate === today;

  const handlePrevDay = () => {
    onDateChange(addDays(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(today);
  };

  // 格式化显示
  const formatDisplay = (dateStr) => {
    if (dateStr === today) return '今天';
    if (dateStr === getYesterday()) return '昨天';
    if (dateStr === getTomorrow()) return '明天';

    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.surfaceSecondary }]}>
        {/* 左箭头 */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={handlePrevDay}
          activeOpacity={0.5}
        >
          <Text style={[styles.arrow, { color: theme.primary }]}>◀</Text>
        </TouchableOpacity>

        {/* 日期信息 */}
        <TouchableOpacity
          style={styles.dateInfo}
          onPress={handleToday}
          activeOpacity={0.7}
        >
          <Text style={[styles.date, { color: theme.textPrimary }]}>
            {formatDisplay(currentDate)}
          </Text>
          <View style={styles.weekdayRow}>
            <View style={[styles.weekdayDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.weekday, { color: theme.textSecondary }]}>
              {getChineseWeekday(currentDate)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 右箭头 */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={handleNextDay}
          activeOpacity={0.5}
        >
          <Text style={[styles.arrow, { color: theme.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  arrowButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateInfo: {
    alignItems: 'center',
  },
  date: {
    fontSize: 18,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  weekdayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  weekday: {
    fontSize: 12,
  },
});
