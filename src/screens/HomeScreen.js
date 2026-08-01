/**
 * 主页 — 卡通风格，展示当前任务和进度
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSchedule } from '../context/ScheduleContext';
import { useTheme } from '../hooks/useTheme';
import DateNavigator from '../components/DateNavigator';
import EmptyState from '../components/EmptyState';
import CuteCard from '../components/CuteCard';
import ProgressStars from '../components/ProgressStars';
import CountdownCard, { calcDaysRemaining } from '../components/CountdownCard';
import PomodoroTimer from '../components/PomodoroTimer';
import { t } from '../i18n';
import { getToday, getChineseWeekday } from '../utils/helpers';
import * as Database from '../modules/storage/Database';

/** 倒计时刷新间隔：10分钟 */
const COUNTDOWN_REFRESH_MS = 10 * 60 * 1000;

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const schedule = useSchedule();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [countdowns, setCountdowns] = useState([]);
  const [pomodoroVisible, setPomodoroVisible] = useState(false);
  const [, forceUpdate] = useState(0); // 用于午夜跨天强制刷新
  const lastDateRef = useRef(getToday());

  // 加载倒计时数据
  const loadCountdowns = useCallback(() => {
    Database.getCountdowns().then(setCountdowns).catch((e) => console.warn('加载倒计时失败:', e));
  }, []);

  // 页面聚焦时加载倒计时
  useFocusEffect(
    useCallback(() => {
      loadCountdowns();
    }, [loadCountdowns])
  );

  // 每10分钟刷新倒计时天数
  useEffect(() => {
    const timer = setInterval(() => {
      loadCountdowns();
    }, COUNTDOWN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadCountdowns]);

  // App 从后台切回前台时刷新
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadCountdowns();
        // 检测午夜跨天
        const today = getToday();
        if (today !== lastDateRef.current) {
          lastDateRef.current = today;
          forceUpdate((n) => n + 1);
        }
      }
    });
    return () => sub.remove();
  }, [loadCountdowns]);

  // 每分钟更新当前时间 + 检测午夜跨天
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      const today = getToday();
      if (today !== lastDateRef.current) {
        lastDateRef.current = today;
        loadCountdowns();
        forceUpdate((n) => n + 1);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [loadCountdowns]);

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

  const isCurrent = !!current;
  const phaseLabel = displayEvent ? displayEvent.phase || '' : '';

  // 根据阶段选择主题色
  const phaseColors = {
    '基础阶段': { bg: theme.cartoon?.sky || '#A8D8EA', accent: theme.cartoon?.mint || '#A8E6CF', emoji: '🌅' },
    '强化阶段': { bg: theme.cartoon?.peach || '#FFD4B8', accent: theme.cartoon?.coral || '#FF9AA2', emoji: '🔥' },
    '冲刺阶段': { bg: theme.cartoon?.lavender || '#DCC8F0', accent: theme.cartoon?.purple || '#C3B1E1', emoji: '🚀' },
  };
  const phaseColor = phaseColors[phaseLabel] || { bg: theme.cartoon?.pink || '#FF8FAB', accent: theme.cartoon?.yellow || '#FFE9A0', emoji: '📋' };

  // 最紧迫的倒计时（显示在日期旁）
  const primaryCountdown = countdowns.length > 0
    ? countdowns.reduce((closest, c) => {
        const d = calcDaysRemaining(c.targetDate);
        const cd = calcDaysRemaining(closest.targetDate);
        // 优先选最近的未过期倒计时
        if (d > 0 && (cd <= 0 || d < cd)) return c;
        if (cd <= 0 && d > 0) return c;
        if (d <= 0 && cd <= 0) return d > cd ? c : closest;
        return closest;
      })
    : null;
  const primaryDays = primaryCountdown ? calcDaysRemaining(primaryCountdown.targetDate) : 0;
  const otherCountdowns = primaryCountdown
    ? countdowns.filter((c) => c.id !== primaryCountdown.id)
    : [];

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

        {/* 日期头部卡片：吉祥物 + 星期 + 倒计时 */}
        <View style={[styles.headerCard, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }]}>
          {/* 装饰光晕 */}
          <View style={[styles.headerGlow, { backgroundColor: theme.primary + '08' }]} />

          {/* 左侧：吉祥物 + 日期信息 */}
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: theme.primary + '15' }]}>
              <Image
                source={require('../../assets/mascot.png')}
                style={styles.headerAvatarImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerDateInfo}>
              <Text style={[styles.headerWeekday, { color: theme.textPrimary }]}>
                {getChineseWeekday(schedule.currentDate)}
              </Text>
              <Text style={[styles.headerDate, { color: theme.textSecondary }]}>
                {schedule.currentDate}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
                {isCurrent ? '🔔 正在进行中...' : total > 0 ? '📋 今天共有 ' + total + ' 个日程' : '☀️ 今天暂无日程'}
              </Text>
            </View>
          </View>

          {/* 右侧：最紧迫倒计时 */}
          {primaryCountdown && primaryDays > 0 ? (
            <TouchableOpacity
              style={[styles.headerCountdown, { backgroundColor: theme.primary + '10' }]}
              onPress={() => navigation.navigate('CountdownManager')}
              activeOpacity={0.8}
            >
              <Text style={[styles.headerCDLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                距离{primaryCountdown.title}
              </Text>
              <View style={styles.headerCDRow}>
                <Text style={[styles.headerCDDays, { color: theme.primary }]}>
                  {primaryDays}
                </Text>
                <Text style={[styles.headerCDUnit, { color: theme.primary }]}>天</Text>
              </View>
            </TouchableOpacity>
          ) : primaryCountdown && primaryDays <= 0 ? (
            <TouchableOpacity
              style={[styles.headerCountdown, { backgroundColor: theme.textTertiary + '10' }]}
              onPress={() => navigation.navigate('CountdownManager')}
              activeOpacity={0.8}
            >
              <Text style={[styles.headerCDLabel, { color: theme.textTertiary }]} numberOfLines={1}>
                {primaryCountdown.title}
              </Text>
              <Text style={[styles.headerCDExpired, { color: theme.textTertiary }]}>已结束</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.headerCountdown, styles.headerCDEmpty, { borderColor: theme.border }]}
              onPress={() => navigation.navigate('CountdownManager')}
              activeOpacity={0.8}
            >
              <Text style={styles.headerCDAddIcon}>+</Text>
              <Text style={[styles.headerCDAddLabel, { color: theme.textTertiary }]}>添加倒计时</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 其他倒计时（水平滚动） */}
        {otherCountdowns.length > 0 && (
          <View style={styles.countdownSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.countdownScroll}
            >
              {otherCountdowns
                .sort((a, b) => calcDaysRemaining(a.targetDate) - calcDaysRemaining(b.targetDate))
                .map((c) => (
                  <CountdownCard
                    key={c.id}
                    countdown={c}
                    compact
                    onPress={() => navigation.navigate('CountdownManager')}
                  />
                ))}
              <TouchableOpacity
                style={[styles.countdownAddCard, {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                }]}
                onPress={() => navigation.navigate('CountdownManager')}
              >
                <Text style={styles.countdownAddIcon}>+</Text>
                <Text style={[styles.countdownAddLabel, { color: theme.textTertiary }]}>添加</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              onPress={() => navigation.navigate('CountdownManager')}
              style={[styles.countdownManageLink, { backgroundColor: theme.primary + '10' }]}
            >
              <Text style={[styles.countdownManageLinkText, { color: theme.primary }]}>
                管理全部倒计时 →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 无日程时的空状态 */}
        {!displayEvent ? (
          <EmptyState
            icon="☀️"
            title={total > 0 ? '今日任务已全部完成' : t('home.noEvents')}
            description={total > 0 ? '太棒了，休息一下吧 🎉' : t('home.noEventsHint')}
            actionLabel={total === 0 ? t('import.title') : ''}
            onAction={total === 0 ? handleImport : undefined}
          />
        ) : (
          <>
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
              <Text style={[styles.cardTime, { color: theme.primaryDark || theme.primary }]}>
                ⏰ {displayEvent.start_time || ''}
                {displayEvent.end_time ? ` — ${displayEvent.end_time}` : ''}
              </Text>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                {displayEvent.title || ''}
              </Text>
              {displayEvent.content ? (
                <View style={[styles.cardContentBox, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                  <Text style={[styles.cardContent, { color: theme.textSecondary }]}>
                    {displayEvent.content}
                  </Text>
                </View>
              ) : null}
              <Image
                source={require('../../assets/task-placeholder.png')}
                style={styles.taskImage}
                resizeMode="cover"
              />
            </CuteCard>

            {/* 后续任务预览 */}
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
          </>
        )}
      </ScrollView>

      {/* 番茄钟浮动按钮 — 始终显示 */}
      <TouchableOpacity
        style={[styles.pomodoroFab, { backgroundColor: theme.primary }]}
        onPress={() => setPomodoroVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.pomodoroFabIcon}>🍅</Text>
      </TouchableOpacity>

      {/* 番茄钟计时器 */}
      <PomodoroTimer
        visible={pomodoroVisible}
        onClose={() => setPomodoroVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  // --- 日期头部卡片 ---
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  headerGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: 38,
    height: 38,
  },
  headerDateInfo: {
    flex: 1,
  },
  headerWeekday: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerDate: {
    fontSize: 13,
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  // 头部右侧倒计时
  headerCountdown: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  headerCDLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: 100,
  },
  headerCDRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerCDDays: {
    fontSize: 38,
    fontWeight: '800',
  },
  headerCDUnit: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 3,
  },
  headerCDExpired: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerCDEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerCDAddIcon: {
    fontSize: 28,
    color: '#B0ADBF',
    fontWeight: '300',
  },
  headerCDAddLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // --- 其他倒计时水平滚动 ---
  countdownSection: {
    marginHorizontal: 16,
    marginBottom: 6,
  },
  countdownScroll: {
    paddingRight: 16,
    paddingBottom: 4,
  },
  countdownAddCard: {
    width: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  countdownAddIcon: { fontSize: 28, color: '#B0ADBF', fontWeight: '300' },
  countdownAddLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  countdownManageLink: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  countdownManageLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- 状态标签 ---
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

  // --- 主任务卡片 ---
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
  taskImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginTop: 4,
  },

  // --- 后续任务区域 ---
  upcomingSection: { marginHorizontal: 16, marginTop: 4, marginBottom: 16 },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upcomingIcon: { fontSize: 18 },
  upcomingTitle: { fontSize: 15, fontWeight: '700' },
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
  nextChipTime: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  nextChipTitle: { fontSize: 13, fontWeight: '500' },

  // --- 番茄钟浮动按钮 ---
  pomodoroFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pomodoroFabIcon: { fontSize: 24 },
});
