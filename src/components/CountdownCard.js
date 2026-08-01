/**
 * CountdownCard — 倒计时卡片组件
 *
 * 简洁显示"距离[事件名]还剩 N 天"。
 * 若已过目标日期则显示"[事件名]已结束"。
 *
 * 天数计算规则：
 * - 当前时间重置为当天 0:00
 * - 目标日期重置为当天 0:00
 * - Math.ceil（过了今天0点就算1天）
 * - ≤0 → 已结束
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * 计算剩余天数
 * @param {string} targetDateStr - 目标日期 YYYY-MM-DD
 * @returns {number} 剩余天数（≤0 表示已过期）
 */
export function calcDaysRemaining(targetDateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr + 'T00:00:00');
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function CountdownCard({ countdown, onPress, compact }) {
  const theme = useTheme();
  const days = calcDaysRemaining(countdown.targetDate);
  const isExpired = days <= 0;

  if (compact) {
    // 紧凑模式：用于首页横向滚动
    return (
      <TouchableOpacity
        style={[styles.compactCard, {
          backgroundColor: theme.surfaceSecondary,
          borderColor: isExpired ? theme.textTertiary + '40' : theme.primary + '30',
        }]}
        onPress={() => onPress && onPress(countdown)}
        activeOpacity={0.8}
      >
        <Text style={[styles.compactLabel, { color: theme.textSecondary }]} numberOfLines={1}>
          距离{countdown.title}
        </Text>
        {isExpired ? (
          <Text style={[styles.compactExpired, { color: theme.textTertiary }]}>已结束</Text>
        ) : (
          <View style={styles.compactDaysRow}>
            <Text style={[styles.compactDays, { color: theme.primary }]}>{days}</Text>
            <Text style={[styles.compactUnit, { color: theme.primary }]}>天</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // 完整模式：用于管理页面
  return (
    <TouchableOpacity
      style={[styles.fullCard, {
        backgroundColor: theme.surface,
        borderLeftColor: isExpired ? theme.textTertiary : theme.primary,
      }]}
      onPress={() => onPress && onPress(countdown)}
      activeOpacity={0.8}
    >
      <View style={styles.fullInfo}>
        <Text style={[styles.fullLabel, { color: theme.textSecondary }]}>
          距离{countdown.title}
        </Text>
        <Text style={[styles.fullDate, { color: theme.textTertiary }]}>
          目标日期：{countdown.targetDate}
        </Text>
      </View>
      <View style={[styles.fullRight, {
        backgroundColor: isExpired ? theme.textTertiary + '15' : theme.primary + '15',
      }]}>
        {isExpired ? (
          <Text style={[styles.fullExpired, { color: theme.textTertiary }]}>已结束</Text>
        ) : (
          <>
            <Text style={[styles.fullDays, { color: theme.primary }]}>{days}</Text>
            <Text style={[styles.fullUnit, { color: theme.primary }]}>天</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 紧凑模式（首页横向滚动）
  compactCard: {
    width: 120,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  compactDaysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  compactDays: {
    fontSize: 36,
    fontWeight: '800',
  },
  compactUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  compactExpired: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 完整模式（管理页面）
  fullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  fullInfo: {
    flex: 1,
    marginRight: 12,
  },
  fullLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  fullDate: {
    fontSize: 13,
  },
  fullRight: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 64,
  },
  fullDays: {
    fontSize: 28,
    fontWeight: '800',
  },
  fullUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
  },
  fullExpired: {
    fontSize: 15,
    fontWeight: '700',
  },
});
