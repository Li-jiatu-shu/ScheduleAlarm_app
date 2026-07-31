/**
 * PomodoroTimer — 番茄钟专注计时器
 *
 * 25分钟工作 / 5分钟休息循环。
 * 可在首页通过浮动按钮打开。
 * 使用标准 React Native Timer，完成后通知。
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Vibration,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

const PHASE = {
  IDLE: 'idle',
  WORK: 'work',
  BREAK: 'break',
  LONG_BREAK: 'long_break',
};

export default function PomodoroTimer({ visible, onClose }) {
  const theme = useTheme();
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    stopTimer();
  }, [stopTimer]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    setPhase(PHASE.IDLE);
    setSecondsLeft(WORK_MINUTES * 60);
  }, [stopTimer]);

  const startWork = useCallback(() => {
    stopTimer();
    setPhase(PHASE.WORK);
    setSecondsLeft(WORK_MINUTES * 60);
    setIsRunning(true);
  }, [stopTimer]);

  const startBreak = useCallback((isLong = false) => {
    stopTimer();
    setPhase(isLong ? PHASE.LONG_BREAK : PHASE.BREAK);
    setSecondsLeft(isLong ? LONG_BREAK_MINUTES * 60 : BREAK_MINUTES * 60);
    setIsRunning(true);
  }, [stopTimer]);

  // 计时器逻辑
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // 时间到
            Vibration.vibrate([0, 300, 200, 300]);
            if (phase === PHASE.WORK) {
              const newCount = completedPomodoros + 1;
              setCompletedPomodoros(newCount);
              // 每4个番茄钟后长休息
              const isLong = newCount % 4 === 0;
              startBreak(isLong);
              return isLong ? LONG_BREAK_MINUTES * 60 : BREAK_MINUTES * 60;
            } else {
              // 休息结束 → 自动开始下一个工作
              startWork();
              return WORK_MINUTES * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => stopTimer();
  }, [isRunning, phase, completedPomodoros, startBreak, startWork, stopTimer]);

  // 关闭时重置
  useEffect(() => {
    if (!visible) {
      resetTimer();
    }
  }, [visible, resetTimer]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress = phase === PHASE.WORK
    ? 1 - secondsLeft / (WORK_MINUTES * 60)
    : phase === PHASE.BREAK
      ? 1 - secondsLeft / (BREAK_MINUTES * 60)
      : phase === PHASE.LONG_BREAK
        ? 1 - secondsLeft / (LONG_BREAK_MINUTES * 60)
        : 0;

  const phaseLabel = {
    [PHASE.IDLE]: t('pomodoro.ready'),
    [PHASE.WORK]: t('pomodoro.working'),
    [PHASE.BREAK]: t('pomodoro.resting'),
    [PHASE.LONG_BREAK]: t('pomodoro.longRest'),
  };

  const phaseColor = {
    [PHASE.IDLE]: theme.primary,
    [PHASE.WORK]: theme.danger,
    [PHASE.BREAK]: theme.success,
    [PHASE.LONG_BREAK]: theme.info,
  };

  const currentColor = phaseColor[phase] || theme.primary;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.modalBackground }]}>
          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>

          {/* 阶段标签 */}
          <Text style={[styles.phaseLabel, { color: currentColor }]}>
            {phaseLabel[phase]}
          </Text>

          {/* 计时器圆环 */}
          <View style={[styles.timerRing, { borderColor: currentColor + '30' }]}>
            <View style={[styles.timerRingInner, {
              backgroundColor: currentColor + '15',
              borderColor: currentColor,
            }]}>
              <Text style={[styles.timerText, { color: currentColor }]}>
                {timeStr}
              </Text>
              <Text style={[styles.timerSub, { color: theme.textSecondary }]}>
                {isRunning ? t('pomodoro.running') : phase === PHASE.IDLE ? t('pomodoro.tapToStart') : t('pomodoro.paused')}
              </Text>
            </View>
          </View>

          {/* 进度条 */}
          <View style={[styles.progressBar, { backgroundColor: theme.surfaceSecondary }]}>
            <View style={[styles.progressFill, {
              backgroundColor: currentColor,
              width: `${progress * 100}%`,
            }]} />
          </View>

          {/* 完成番茄数 */}
          <View style={styles.pomodoroRow}>
            {Array.from({ length: Math.min(completedPomodoros, 12) }).map((_, i) => (
              <Text key={i} style={styles.pomodoroIcon}>🍅</Text>
            ))}
            {completedPomodoros === 0 && (
              <Text style={[styles.noPomodoro, { color: theme.textTertiary }]}>
                {t('pomodoro.noPomodoros')}
              </Text>
            )}
          </View>

          {/* 控制按钮 */}
          <View style={styles.controls}>
            {phase === PHASE.IDLE ? (
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: theme.danger }]}
                onPress={startWork}
              >
                <Text style={styles.mainBtnText}>{t('pomodoro.startFocus')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                {isRunning ? (
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: theme.warning + '30' }]}
                    onPress={pauseTimer}
                  >
                    <Text style={[styles.controlBtnText, { color: theme.warning }]}>{t('pomodoro.pause')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: theme.success + '30' }]}
                    onPress={startTimer}
                  >
                    <Text style={[styles.controlBtnText, { color: theme.success }]}>{t('pomodoro.resume')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={resetTimer}
                >
                  <Text style={[styles.controlBtnText, { color: theme.textSecondary }]}>{t('pomodoro.reset')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={[styles.totalLabel, { color: theme.textTertiary }]}>
            {t('pomodoro.totalCompleted', { count: completedPomodoros })}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 20, fontWeight: '300' },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  timerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerRingInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pomodoroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 24,
    minHeight: 24,
  },
  pomodoroIcon: { fontSize: 20 },
  noPomodoro: { fontSize: 12 },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mainBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
  },
  mainBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  controlBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  controlBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalLabel: { fontSize: 12, fontWeight: '500' },
});
