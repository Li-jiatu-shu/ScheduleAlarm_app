/**
 * 全屏提醒弹窗组件
 *
 * 高优先级通知弹窗，展示任务详情，
 * 集成闹铃播放和TTS语音播报。
 *
 * 流程：弹窗出现 → 语音播报中（可选择手动操作）
 * → 语音完成后自动标记任务开始
 *
 * 提供"开始执行"、"稍后提醒"、"跳过"操作按钮。
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Image,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';

export default function ReminderModal({
  visible = false,
  event = null,
  voicePlaying = false,
  voiceFinished = false,
  onAction,
  onClose,
}) {
  const theme = useTheme();
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const hasInteracted = useRef(false);
  const autoStartedRef = useRef(false);

  // 重置交互状态
  useEffect(() => {
    if (!visible || !event) return;
    hasInteracted.current = false;
    autoStartedRef.current = false;
  }, [visible, event]);

  // 监听语音完成 → 自动开始执行
  useEffect(() => {
    if (
      visible &&
      voiceFinished &&
      !hasInteracted.current &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      // 延迟1秒给用户缓冲，然后自动开始
      const timer = setTimeout(() => {
        if (!hasInteracted.current) {
          onAction?.('start', event);
          onClose?.();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, voiceFinished, event, onAction, onClose]);

  // 开始执行
  const handleStart = useCallback(() => {
    hasInteracted.current = true;
    onAction?.('start', event);
  }, [event, onAction]);

  // 稍后提醒
  const handleSnooze = useCallback(
    (minutes) => {
      hasInteracted.current = true;
      setSnoozeMenuOpen(false);
      onAction?.('snooze', { ...event, snoozeMinutes: minutes });
    },
    [event, onAction]
  );

  // 跳过
  const handleSkip = useCallback(() => {
    hasInteracted.current = true;
    onAction?.('skip', event);
  }, [event, onAction]);

  // 关闭
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!event) return null;

  const eventTitle = event.title || event.data?.title || '';
  const eventContent = event.content || event.data?.content || '';
  const eventStartTime = event.start_time || event.data?.startTime || '';
  const eventEndTime = event.end_time || event.data?.endTime || '';
  const eventPhase = event.phase || event.data?.phase || '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.background }]}>
        {/* 顶部状态栏提示 */}
        <View style={[styles.topBar, { backgroundColor: theme.warning }]}>
          <Image
            source={require('../../assets/alarm-icon.png')}
            style={styles.alarmIcon}
            resizeMode="contain"
          />
          <Text style={styles.topBarText}>{t('reminder.taskStart')}</Text>
        </View>

        {/* 语音播报状态栏 */}
        <View style={[styles.voiceBar, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.voiceInfo}>
            {voicePlaying ? (
              <>
                <Text style={[styles.voiceIcon]}>🔊</Text>
                <Text style={[styles.voiceText, { color: theme.primary }]}>
                  正在语音播报任务内容...
                </Text>
              </>
            ) : voiceFinished ? (
              <>
                <Text style={[styles.voiceIcon]}>✅</Text>
                <Text style={[styles.voiceText, { color: theme.success }]}>
                  语音播报完成，即将自动开始...
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.voiceIcon]}>📋</Text>
                <Text style={[styles.voiceText, { color: theme.textSecondary }]}>
                  请在下方选择操作
                </Text>
              </>
            )}
          </View>
          {/* 语音播报进度指示器 */}
          {voicePlaying && (
            <View style={[styles.voiceTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.voiceTrackInner, { backgroundColor: theme.primary }]} />
            </View>
          )}
        </View>

        {/* 主内容区 */}
        <View style={styles.content}>
          {/* 阶段标签 */}
          {eventPhase ? (
            <View style={[styles.phaseBadge, { backgroundColor: theme.phaseBase }]}>
              <Text style={[styles.phaseBadgeText, { color: theme.phaseBaseText }]}>
                {eventPhase}
              </Text>
            </View>
          ) : null}

          {/* 时间 */}
          <Text style={[styles.timeDisplay, { color: theme.primary }]}>
            {eventStartTime}
            {eventEndTime ? ` - ${eventEndTime}` : ''}
          </Text>

          {/* 任务标题 */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {eventTitle}
          </Text>

          {/* 任务内容 */}
          {eventContent ? (
            <View style={[styles.contentBox, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.contentText, { color: theme.textSecondary }]}>
                {eventContent}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 底部操作按钮 */}
        <View style={[styles.actions, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          {/* 开始执行 */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.success }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>
              ✅ {t('reminder.startTask')}
            </Text>
          </TouchableOpacity>

          {/* 稍后提醒 + 跳过 */}
          <View style={styles.secondaryActions}>
            {/* 稍后提醒 */}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => setSnoozeMenuOpen(!snoozeMenuOpen)}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>
                ⏱ {t('reminder.snooze')}
              </Text>
            </TouchableOpacity>

            {/* 跳过 */}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                ⏭ {t('reminder.skip')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 稍后提醒选项菜单 */}
          {snoozeMenuOpen && (
            <View style={[styles.snoozeMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[5, 10, 15].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.snoozeOption, { borderBottomColor: theme.border }]}
                  onPress={() => handleSnooze(minutes)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.snoozeOptionText, { color: theme.primary }]}>
                    {t('reminder.snoozeMinutes', { minutes })}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.snoozeOption}
                onPress={() => setSnoozeMenuOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.snoozeOptionText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  alarmIcon: {
    width: 28,
    height: 28,
  },
  topBarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  voiceBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  voiceIcon: {
    fontSize: 20,
  },
  voiceText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  voiceTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  voiceTrackInner: {
    height: '100%',
    borderRadius: 2,
    // 动画进度条 — 使用 indeterminate 效果
    width: '60%',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  phaseBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeDisplay: {
    fontSize: 52,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 24,
    lineHeight: 44,
  },
  contentBox: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  contentText: {
    fontSize: 19,
    lineHeight: 28,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  snoozeMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  snoozeOption: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  snoozeOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
