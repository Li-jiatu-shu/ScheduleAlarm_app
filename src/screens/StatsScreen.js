/**
 * 统计页面
 *
 * 展示任务完成率和统计数据，
 * 包含热力图、完成率图表等。
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchedule } from '../context/ScheduleContext';
import { useTheme } from '../hooks/useTheme';
import EmptyState from '../components/EmptyState';
import { t } from '../i18n';
import { getToday, addDays, getChineseWeekday } from '../utils/helpers';

export default function StatsScreen() {
  const theme = useTheme();
  const schedule = useSchedule();

  const [stats, setStats] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bestDay, setBestDay] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadStats();
  }, [schedule.events.length]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = getToday();
      const weekStart = addDays(today, -6);

      // 今日统计
      const todayStats = await schedule.getStats(today, today);
      setStats(todayStats);

      // 本周每日统计
      const daily = await schedule.getDailyStats(weekStart, today);
      setWeeklyStats(daily);

      // 找出最佳日
      if (daily.length > 0) {
        let best = null;
        for (const d of daily) {
          if (d.total > 0) {
            const rate = d.completed / d.total;
            if (!best || rate > best.rate) {
              best = { date: d.date, rate, completed: d.completed, total: d.total };
            }
          }
        }
        setBestDay(best);
      }

      // 计算连续完成天数（从昨天往回算）
      let streakDays = 0;
      let checkDate = addDays(today, -1);
      for (let i = 0; i < 30; i++) {
        const dayStats = daily.find((d) => d.date === checkDate);
        if (dayStats && dayStats.total > 0 && dayStats.completed === dayStats.total) {
          streakDays++;
          checkDate = addDays(checkDate, -1);
        } else {
          break;
        }
      }
      setStreak(streakDays);
    } catch (err) {
      console.warn('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [schedule]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <EmptyState
          icon="📊"
          title={t('stats.noData')}
          description="导入日程并完成任务后，这里将展示你的完成数据"
        />
      </SafeAreaView>
    );
  }

  const todayRate = stats.total > 0 ? stats.completed / stats.total : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('stats.title')}
        </Text>

        {/* 今日完成率卡片 */}
        <View style={[styles.rateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>
            {t('stats.todayCompletion')}
          </Text>
          <Text style={[styles.rateNumber, { color: theme.primary }]}>
            {Math.round(todayRate * 100)}%
          </Text>
          <Text style={[styles.rateDetail, { color: theme.textTertiary }]}>
            {stats.completed}/{stats.total} {t('stats.completed')}
          </Text>
          {/* 进度条 */}
          <View style={[styles.rateBar, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.rateBarFill,
                {
                  backgroundColor: todayRate >= 1 ? theme.success : theme.primary,
                  width: `${Math.round(todayRate * 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* 统计摘要 */}
        <View style={styles.summaryRow}>
          {/* 连续天数 */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.summaryValue, { color: theme.warning }]}>
              {streak}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              {t('stats.streak')}
            </Text>
          </View>

          {/* 本周完成率 */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.summaryValue, { color: theme.info }]}>
              {weeklyStats.length > 0
                ? Math.round(
                    (weeklyStats.reduce((s, d) => s + d.completed, 0) /
                      Math.max(1, weeklyStats.reduce((s, d) => s + d.total, 0))) *
                      100
                  ) + '%'
                : '--'}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              {t('stats.weeklyCompletion')}
            </Text>
          </View>

          {/* 最佳日 */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.summaryValue, { color: theme.success }]}>
              {bestDay ? Math.round(bestDay.rate * 100) + '%' : '--'}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              {t('stats.bestDay')}
            </Text>
          </View>
        </View>

        {/* 本周热力图（简易版） */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('stats.heatmap')}
        </Text>
        <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heatmapRow}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(getToday(), -(6 - i));
              const dayStats = weeklyStats.find((d) => d.date === date);
              const rate = dayStats && dayStats.total > 0
                ? dayStats.completed / dayStats.total
                : -1;

              return (
                <View key={date} style={styles.heatmapCol}>
                  <View
                    style={[
                      styles.heatmapCell,
                      {
                        backgroundColor: getHeatColor(rate, theme),
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.heatmapLabel,
                      { color: date === getToday() ? theme.primary : theme.textTertiary },
                    ]}
                  >
                    {getChineseWeekday(date).replace('周', '')}
                  </Text>
                  <Text style={[styles.heatmapPct, { color: theme.textTertiary }]}>
                    {rate >= 0 ? Math.round(rate * 100) + '%' : '--'}
                  </Text>
                </View>
              );
            })}
          </View>
          {/* 图例 */}
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>0%</Text>
            <View style={[styles.legendCell, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]} />
            <View style={[styles.legendCell, { backgroundColor: theme.taskPending }]} />
            <View style={[styles.legendCell, { backgroundColor: theme.primaryLight }]} />
            <View style={[styles.legendCell, { backgroundColor: theme.success }]} />
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>100%</Text>
          </View>
        </View>

        {/* 拖延分析 */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('delay.title')}
        </Text>
        <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {(() => {
            const today = getToday();
            const todayEvents = schedule.events.filter((e) => e.date === today);
            const total = todayEvents.length;
            const completed = todayEvents.filter((e) => e.completed === 1).length;
            const skipped = todayEvents.filter((e) => e.completed === 0 && !e.enabled !== false).length;

            if (total === 0) {
              return (
                <Text style={[styles.delayEmpty, { color: theme.textTertiary }]}>
                  {t('delay.noData')}
                </Text>
              );
            }

            // 模拟延迟分析：检查已完成任务是否在规定时间内完成
            const delayedTasks = todayEvents.filter((e) => {
              if (e.completed !== 1 || !e.completed_at) return false;
              const [h, m] = (e.end_time || e.start_time || '').split(':').map(Number);
              if (isNaN(h) || isNaN(m)) return false;
              const taskEnd = new Date(today);
              taskEnd.setHours(h, m, 0, 0);
              const completedAt = new Date(e.completed_at);
              return completedAt > taskEnd;
            });

            const delayRate = total > 0 ? ((skipped + delayedTasks.length) / total * 100) : 0;

            return (
              <View>
                {/* 拖延率指标 */}
                <View style={styles.delayMainRow}>
                  <View style={styles.delayScoreCircle}>
                    <Text style={[styles.delayScoreNumber, {
                      color: delayRate > 50 ? theme.danger : delayRate > 25 ? theme.warning : theme.success,
                    }]}>
                      {Math.round(delayRate)}%
                    </Text>
                    <Text style={[styles.delayScoreLabel, { color: theme.textTertiary }]}>
                      {t('delay.delayRate')}
                    </Text>
                  </View>
                  <View style={styles.delayStats}>
                    <View style={styles.delayStatRow}>
                      <Text style={styles.delayStatDot}>⏭</Text>
                      <Text style={[styles.delayStatText, { color: theme.textSecondary }]}>
                        {t('delay.skippedTasks', { count: skipped })}
                      </Text>
                    </View>
                    <View style={styles.delayStatRow}>
                      <Text style={styles.delayStatDot}>⏰</Text>
                      <Text style={[styles.delayStatText, { color: theme.textSecondary }]}>
                        {t('delay.delayedTasks', { count: delayedTasks.length })}
                      </Text>
                    </View>
                    <View style={styles.delayStatRow}>
                      <Text style={styles.delayStatDot}>✅</Text>
                      <Text style={[styles.delayStatText, { color: theme.textSecondary }]}>
                        {t('delay.onTimeTasks', { count: completed - delayedTasks.length })}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.delayTip, {
                  backgroundColor: delayRate > 50 ? theme.danger + '15' : delayRate > 25 ? theme.warning + '15' : theme.success + '15',
                }]}>
                  <Text style={[styles.delayTipText, {
                    color: delayRate > 50 ? theme.danger : delayRate > 25 ? theme.warning : theme.success,
                  }]}>
                    {delayRate > 50
                      ? t('delay.warning')
                      : delayRate > 25
                        ? t('delay.improve')
                        : delayRate === 0
                          ? t('delay.perfect')
                          : t('delay.good')}
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>

        {/* 阶段统计 */}
        {schedule.phases.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              阶段统计
            </Text>
            <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {schedule.phases.map((phase) => {
                const phaseEvents = schedule.events.filter((e) => e.phase === phase);
                const completed = phaseEvents.filter((e) => e.completed === 1).length;
                const total = phaseEvents.length;
                const rate = total > 0 ? completed / total : 0;

                return (
                  <View key={phase} style={[styles.phaseRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.phaseName, { color: theme.textPrimary }]}>
                      {phase}
                    </Text>
                    <View style={styles.phaseStats}>
                      <Text style={[styles.phaseCount, { color: theme.textSecondary }]}>
                        {completed}/{total}
                      </Text>
                      <Text style={[styles.phaseRate, { color: rate >= 1 ? theme.success : theme.primary }]}>
                        {Math.round(rate * 100)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 根据完成率获取热力图颜色
 */
function getHeatColor(rate, theme) {
  if (rate < 0) return theme.surfaceSecondary;
  if (rate === 0) return theme.taskPending;
  if (rate < 0.5) return theme.taskPending;
  if (rate < 0.75) return theme.primaryLight;
  if (rate < 1) return theme.primary;
  return theme.success;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  rateCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  rateNumber: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
  },
  rateDetail: {
    fontSize: 13,
    marginBottom: 16,
  },
  rateBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  heatmapCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatmapCol: {
    alignItems: 'center',
    gap: 6,
  },
  heatmapCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  heatmapLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  heatmapPct: {
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
  },
  legendText: {
    fontSize: 10,
    marginHorizontal: 4,
  },
  legendCell: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '500',
  },
  phaseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phaseCount: {
    fontSize: 13,
  },
  phaseRate: {
    fontSize: 15,
    fontWeight: '700',
  },
  // 拖延分析样式
  delayEmpty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  delayMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 14,
  },
  delayScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  delayScoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  delayScoreLabel: {
    fontSize: 10,
    marginTop: -2,
  },
  delayStats: {
    flex: 1,
    gap: 6,
  },
  delayStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delayStatDot: {
    fontSize: 14,
  },
  delayStatText: {
    fontSize: 13,
  },
  delayTip: {
    borderRadius: 10,
    padding: 12,
  },
  delayTipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
});
