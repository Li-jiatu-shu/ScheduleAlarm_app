/**
 * 主页 — 卡通风格，展示当前任务和进度
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchedule } from '../context/ScheduleContext';
import { useTheme } from '../hooks/useTheme';
import DateNavigator from '../components/DateNavigator';
import EmptyState from '../components/EmptyState';
import CuteCard from '../components/CuteCard';
import ProgressStars from '../components/ProgressStars';
import { t } from '../i18n';
import { getToday, getChineseWeekday } from '../utils/helpers';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const schedule = useSchedule();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  // 每分钟更新当前时间
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMin = now.getHours() * 60 + now.getMinutes();

  // 找出当前进行中或下一个任务
  const { current, upcoming, completed, total } = useMemo(() => {
    const today = getToday();
    const todayEvents = schedule.events.filter((e) => e.date === today);
    const done = todayEvents.filter((e) => e.completed === 1).length;

    // 当前进行中的任务
    let ongoing = null;
    // 下一个未开始的任务
    let next = null;

    for (const e of todayEvents) {
      if (e.completed === 1) continue;
      const [h, m] = (e.start_time || '').split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      const eventMin = h * 60 + m;

      if (currentMin >= eventMin) {
        // 任务已开始，检查是否还在时间范围内
        if (e.end_time) {
          const [eh, em] = e.end_time.split(':').map(Number);
          const endMin = eh * 60 + em;
          if (currentMin <= endMin) { ongoing = e; break; }
        } else {
          // 没有结束时间，视为进行中（最多持续到下一任务开始前）
          ongoing = e;
          break;
        }
      }
    }

    // 找下一个未开始的任务
    if (!ongoing) {
      for (const e of todayEvents) {
        if (e.completed === 1) continue;
        const [h, m] = (e.start_time || '').split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const eventMin = h * 60 + m;
        if (eventMin > currentMin) {
          if (!next || eventMin < next.eventMin) {
            next = { ...e, eventMin };
          }
        }
      }
    }

    return {
      current: ongoing,
      upcoming: next,
      completed: done,
      total: todayEvents.length,
    };
  }, [schedule.events, currentMin]);

  const progress = total > 0 ? completed / total : 0;
  const displayEvent = current || upcoming;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await schedule.loadEvents(schedule.currentDate, schedule.selectedPhase);
    setRefreshing(false);
  }, [schedule]);

  const handleImport = () => navigation.navigate('ImportTab');

  if (schedule.loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayEvent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <DateNavigator currentDate={schedule.currentDate} onDateChange={schedule.changeDate} />
        <EmptyState
          icon="☀️"
          title={total > 0 ? '今日任务已全部完成' : t('home.noEvents')}
          description={total > 0 ? '太棒了，休息一下吧 🎉' : t('home.noEventsHint')}
          actionLabel={total === 0 ? t('import.title') : ''}
          onAction={total === 0 ? handleImport : undefined}
        />
      </SafeAreaView>
    );
  }

  const isCurrent = !!current;
  const phaseLabel = displayEvent.phase || '';

  // 根据阶段选择主题色
  const phaseColors = {
    '基础阶段': { bg: theme.cartoon?.sky || '#A8D8EA', accent: theme.cartoon?.mint || '#A8E6CF', emoji: '🌅' },
    '强化阶段': { bg: theme.cartoon?.peach || '#FFD4B8', accent: theme.cartoon?.coral || '#FF9AA2', emoji: '🔥' },
    '冲刺阶段': { bg: theme.cartoon?.lavender || '#DCC8F0', accent: theme.cartoon?.purple || '#C3B1E1', emoji: '🚀' },
  };
  const phaseColor = phaseColors[phaseLabel] || { bg: theme.cartoon?.pink || '#FF8FAB', accent: theme.cartoon?.yellow || '#FFE9A0', emoji: '📋' };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={theme.primary} colors={[theme.primary]} />
        }
      >
        {/* 日期导航 */}
        <DateNavigator currentDate={schedule.currentDate} onDateChange={schedule.changeDate} />

        {/* 吉祥物区域 */}
        <View style={styles.mascotRow}>
          <View style={[styles.mascotCircle, { backgroundColor: theme.surfaceSecondary }]}>
            <Image
              source={require('../../assets/mascot.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.mascotInfo}>
            <Text style={[styles.mascotTitle, { color: theme.textPrimary }]}>
              {getChineseWeekday(schedule.currentDate)}
            </Text>
            <Text style={[styles.mascotSubtitle, { color: theme.textSecondary }]}>
              {isCurrent ? '正在进行中...' : '即将开始的任务'}
            </Text>
          </View>
          {/* 装饰星星 */}
          <Text style={styles.sparkle1}>✨</Text>
          <Text style={styles.sparkle2}>💫</Text>
        </View>

        {/* 星星进度 */}
        <ProgressStars completed={completed} total={total} />

        {/* 状态标签 */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, {
            backgroundColor: isCurrent ? theme.taskPending : phaseColor.bg,
            borderColor: isCurrent ? theme.warning + '40' : 'transparent',
            borderWidth: 1,
          }]}>
            <Text style={[styles.statusText, {
              color: isCurrent ? theme.taskPendingText : theme.phaseBaseText,
            }]}>
              {isCurrent ? '🔔 正在进行' : '📌 即将开始'}
            </Text>
          </View>
          {phaseLabel ? (
            <View style={[styles.phaseTag, { backgroundColor: phaseColor.bg }]}>
              <Text style={[styles.phaseText, { color: theme.phaseBaseText }]}>
                {phaseColor.emoji} {phaseLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 主任务卡片 */}
        <CuteCard
          color={phaseColor.bg}
          accentColor={phaseColor.accent}
          emoji={phaseColor.emoji}
          onPress={() => navigation.navigate('EditTask', { eventId: displayEvent.id })}
          style={styles.mainCard}
        >
          {/* 时间 */}
          <Text style={[styles.cardTime, { color: theme.primaryDark || theme.primary }]}>
            ⏰ {displayEvent.start_time || ''}
            {displayEvent.end_time ? ` — ${displayEvent.end_time}` : ''}
          </Text>

          {/* 标题 */}
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {displayEvent.title || ''}
          </Text>

          {/* 内容 */}
          {displayEvent.content ? (
            <View style={[styles.cardContentBox, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
              <Text style={[styles.cardContent, { color: theme.textSecondary }]}>
                {displayEvent.content}
              </Text>
            </View>
          ) : null}

          {/* 任务配图 */}
          <Image
            source={require('../../assets/task-placeholder.png')}
            style={styles.taskImage}
            resizeMode="cover"
          />
        </CuteCard>

        {/* 后续任务预览 — 圆角芯片样式 */}
        {schedule.events.filter((e) => {
          if (e.date !== schedule.currentDate) return false;
          if (e.id === displayEvent.id) return false;
          if (e.completed === 1) return false;
          const [h, m] = (e.start_time || '').split(':').map(Number);
          return !isNaN(h) && (h * 60 + m) > currentMin;
        }).length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingIcon}>📋</Text>
              <Text style={[styles.upcomingTitle, { color: theme.textSecondary }]}>
                接下来要做的事...
              </Text>
            </View>
            <View style={styles.chipRow}>
              {schedule.events
                .filter((e) => {
                  if (e.date !== schedule.currentDate) return false;
                  if (e.id === displayEvent.id) return false;
                  if (e.completed === 1) return false;
                  const [h, m] = (e.start_time || '').split(':').map(Number);
                  return !isNaN(h) && (h * 60 + m) > currentMin;
                })
                .slice(0, 5)
                .map((e, idx) => {
                  const chipColors = [
                    theme.cartoon?.pink, theme.cartoon?.lavender,
                    theme.cartoon?.mint, theme.cartoon?.sky,
                    theme.cartoon?.peach,
                  ];
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.nextChip, {
                        backgroundColor: (chipColors[idx] || theme.surfaceSecondary) + '60',
                        borderColor: chipColors[idx] || theme.border,
                      }]}
                      onPress={() => navigation.navigate('EditTask', { eventId: e.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.nextChipTime, { color: theme.primary }]}>
                        🕐 {e.start_time}
                      </Text>
                      <Text style={[styles.nextChipTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {e.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  // 吉祥物区域
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  mascotCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 40,
    height: 40,
  },
  mascotInfo: {
    flex: 1,
  },
  mascotTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  mascotSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sparkle1: {
    position: 'absolute',
    top: 4,
    right: 20,
    fontSize: 16,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 2,
    right: 48,
    fontSize: 14,
  },

  // 状态标签
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  statusText: { fontSize: 15, fontWeight: '700' },
  phaseTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  phaseText: { fontSize: 13, fontWeight: '600' },

  // 主任务卡片
  mainCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  cardTime: { fontSize: 32, fontWeight: '800', marginBottom: 12 },
  cardTitle: { fontSize: 26, fontWeight: '700', marginBottom: 14, lineHeight: 34 },
  cardContentBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardContent: { fontSize: 16, lineHeight: 24 },

  // 任务配图
  taskImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginTop: 4,
  },

  // 后续任务区域
  upcomingSection: { marginHorizontal: 16, marginTop: 4 },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upcomingIcon: {
    fontSize: 18,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nextChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '48%',
  },
  nextChipTime: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  nextChipTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
