/**
 * 时间线条目组件
 * 展示单个日程事件的时间线样式
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
export default function TimelineItem({ event, isFirst, isLast, onPress }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isCompleted = event.completed === 1;
  const isCurrentTime = isCurrentEvent(event);
  const phaseColor = getPhaseColors(event.phase, theme);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress ? onPress(event) : setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* 时间轴线 */}
      <View style={styles.timeline}>
        <View
          style={[
            styles.lineTop,
            {
              backgroundColor: isFirst ? 'transparent' : theme.timelineLine,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isCompleted
                ? theme.timelineDotCompleted
                : isCurrentTime
                ? theme.warning
                : theme.timelineDot,
              borderColor: isCurrentTime ? theme.warning : theme.timelineDot,
            },
          ]}
        />
        <View
          style={[
            styles.lineBottom,
            {
              backgroundColor: isLast ? 'transparent' : theme.timelineLine,
            },
          ]}
        />
      </View>

      {/* 事件内容 */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isCompleted
              ? theme.taskCompleted
              : isCurrentTime
              ? theme.taskPending
              : theme.surface,
            borderColor: isCurrentTime ? theme.warning : theme.border,
          },
        ]}
      >
        {/* 时间 */}
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.time,
              {
                color: isCompleted ? theme.taskCompletedText : theme.primary,
              },
            ]}
          >
            {event.start_time}
            {event.end_time ? ` - ${event.end_time}` : ''}
          </Text>
          <View style={[styles.phaseTag, { backgroundColor: phaseColor.bg }]}>
            <Text style={[styles.phaseText, { color: phaseColor.text }]}>
              {event.phase}
            </Text>
          </View>
        </View>

        {/* 标题 */}
        <Text
          style={[
            styles.title,
            {
              color: isCompleted ? theme.taskCompletedText : theme.textPrimary,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={expanded ? undefined : 2}
        >
          {event.title}
        </Text>

        {/* 展开内容 */}
        {expanded && event.content ? (
          <Text
            style={[styles.content, { color: theme.textSecondary }]}
          >
            {event.content}
          </Text>
        ) : null}

      </View>
    </TouchableOpacity>
  );
}

/**
 * 判断事件是否为当前正在进行的时间段
 */
function isCurrentEvent(event) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (event.date !== today) return false;

  const [h, m] = event.start_time.split(':').map(Number);
  const eventTime = h * 60 + m;
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (event.end_time) {
    const [eh, em] = event.end_time.split(':').map(Number);
    const endTime = eh * 60 + em;
    return currentTime >= eventTime && currentTime <= endTime;
  }

  return currentTime >= eventTime && currentTime <= eventTime + 30;
}

/**
 * 根据阶段名称获取颜色
 */
function getPhaseColors(phase, theme) {
  if (phase.includes('基础')) {
    return { bg: theme.phaseBase, text: theme.phaseBaseText };
  }
  if (phase.includes('强化')) {
    return { bg: theme.phaseIntensive, text: theme.phaseIntensiveText };
  }
  if (phase.includes('冲刺')) {
    return { bg: theme.phaseSprint, text: theme.phaseSprintText };
  }
  return { bg: theme.phaseBase, text: theme.phaseBaseText };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  timeline: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  lineTop: {
    width: 2,
    height: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  lineBottom: {
    width: 2,
    flex: 1,
    minHeight: 10,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 21,
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 10,
  },
});
