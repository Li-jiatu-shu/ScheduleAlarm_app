/**
 * ProgressStars — 卡通星星进度指示器
 *
 * 用5颗星星显示完成进度，配合激励性文字。
 * 已完成的任务越多，星星越亮越多。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function ProgressStars({
  completed = 0,
  total = 0,
  showMotivation = true,
}) {
  const theme = useTheme();

  if (total === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
          🌟 等待今日任务...
        </Text>
      </View>
    );
  }

  const ratio = completed / total;
  const starCount = 5;
  const filledStars = Math.round(ratio * starCount);

  // 根据完成率选择激励语
  let motivation = '';
  let motivationEmoji = '';
  if (ratio >= 1) {
    motivation = '全部完成！太厉害了 🎉';
    motivationEmoji = '🏆';
  } else if (ratio >= 0.6) {
    motivation = '进展不错，继续加油 💪';
    motivationEmoji = '🌟';
  } else if (ratio > 0) {
    motivation = '好的开始，坚持下去 ✨';
    motivationEmoji = '💫';
  } else {
    motivation = '新的一天开始啦 ☀️';
    motivationEmoji = '🌱';
  }

  return (
    <View style={styles.container}>
      {/* 星星行 */}
      <View style={styles.starRow}>
        {Array.from({ length: starCount }, (_, i) => (
          <Text
            key={i}
            style={[
              styles.star,
              {
                opacity: i < filledStars ? 1 : 0.25,
                transform: [{ scale: i < filledStars ? 1.15 : 0.85 }],
              },
            ]}
          >
            ⭐
          </Text>
        ))}
      </View>

      {/* 数字显示 */}
      <Text style={[styles.countText, { color: theme.textSecondary }]}>
        {completed}/{total} 已完成
      </Text>

      {/* 激励语 */}
      {showMotivation && (
        <View style={[styles.motivationRow, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={styles.motivationEmoji}>{motivationEmoji}</Text>
          <Text style={[styles.motivationText, { color: theme.primary }]}>
            {motivation}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  star: {
    fontSize: 28,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  motivationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  motivationEmoji: {
    fontSize: 18,
  },
  motivationText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 8,
  },
});
