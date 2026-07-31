/**
 * CountdownCard — 倒计时卡片组件
 *
 * 显示单个倒计时：图标、名称、剩余天数、目标日期。
 * 天数越少颜色越紧急：红(<3) → 橙(<7) → 蓝(<30) → 绿(>=30)
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatDate } from '../utils/helpers';

/**
 * 计算两个日期相差的天数（date2 - date1）
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 根据剩余天数返回紧急程度颜色
 */
function getUrgencyColor(days, theme) {
  if (days < 0) return theme.textTertiary;    // 已过期
  if (days <= 3) return theme.danger;          // 红色 — 3天内
  if (days <= 7) return theme.warning;          // 橙色 — 7天内
  if (days <= 30) return theme.info;            // 蓝色 — 30天内
  return theme.success;                          // 绿色 — 30天以上
}

export default function CountdownCard({ countdown, onPress, compact }) {
  const theme = useTheme();
  const today = formatDate(new Date());
  const days = daysBetween(today, countdown.targetDate);

  const urgencyColor = getUrgencyColor(days, theme);

  // 剩余天数文字
  let daysText;
  if (days < 0) {
    daysText = `已过 ${Math.abs(days)} 天`;
  } else if (days === 0) {
    daysText = '就是今天！';
  } else {
    daysText = `${days}`;
  }

  if (compact) {
    // 紧凑模式：用于首页横向滚动
    return (
      <TouchableOpacity
        style={[styles.compactCard, {
          backgroundColor: theme.surfaceSecondary,
          borderColor: urgencyColor + '40',
        }]}
        onPress={() => onPress && onPress(countdown)}
        activeOpacity={0.8}
      >
        <Text style={styles.compactEmoji}>{countdown.emoji || '📅'}</Text>
        <Text style={[styles.compactDays, { color: urgencyColor }]}>
          {daysText}
        </Text>
        <Text style={[styles.compactUnit, { color: urgencyColor }]}>
          {days < 0 ? '' : days === 0 ? '' : '天'}
        </Text>
        <Text style={[styles.compactTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {countdown.title}
        </Text>
        <Text style={[styles.compactDate, { color: theme.textTertiary }]}>
          {countdown.targetDate}
        </Text>
      </TouchableOpacity>
    );
  }

  // 完整模式：用于管理页面
  return (
    <TouchableOpacity
      style={[styles.fullCard, {
        backgroundColor: theme.surface,
        borderLeftColor: urgencyColor,
      }]}
      onPress={() => onPress && onPress(countdown)}
      activeOpacity={0.8}
    >
      <View style={styles.fullLeft}>
        <Text style={styles.fullEmoji}>{countdown.emoji || '📅'}</Text>
      </View>
      <View style={styles.fullCenter}>
        <Text style={[styles.fullTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {countdown.title}
        </Text>
        <Text style={[styles.fullDate, { color: theme.textSecondary }]}>
          {countdown.targetDate}
        </Text>
        {countdown.type && countdown.type !== 'other' ? (
          <View style={[styles.typeTag, { backgroundColor: (countdown.color || theme.primary) + '20' }]}>
            <Text style={[styles.typeTagText, { color: countdown.color || theme.primary }]}>
              {countdown.type}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.fullRight, { backgroundColor: urgencyColor + '15' }]}>
        <Text style={[styles.fullDaysNumber, { color: urgencyColor }]}>
          {daysText}
        </Text>
        <Text style={[styles.fullDaysLabel, { color: urgencyColor }]}>
          {days < 0 ? '' : days === 0 ? '🎉' : '天'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 紧凑模式
  compactCard: {
    width: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  compactEmoji: { fontSize: 28, marginBottom: 6 },
  compactDays: { fontSize: 28, fontWeight: '800' },
  compactUnit: { fontSize: 11, fontWeight: '600', marginTop: -2, marginBottom: 4 },
  compactTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  compactDate: { fontSize: 10 },

  // 完整模式
  fullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  fullLeft: { marginRight: 12 },
  fullEmoji: { fontSize: 32 },
  fullCenter: { flex: 1 },
  fullTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  fullDate: { fontSize: 13, marginBottom: 4 },
  typeTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeTagText: { fontSize: 11, fontWeight: '600' },
  fullRight: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 56,
  },
  fullDaysNumber: { fontSize: 24, fontWeight: '800' },
  fullDaysLabel: { fontSize: 12, fontWeight: '600', marginTop: -2 },
});
