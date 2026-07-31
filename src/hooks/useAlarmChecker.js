/**
 * useAlarmChecker — 前台定时提醒 + 通知点击唤起弹窗 + 报警队列
 *
 * v1.3.0: 重构为报警队列模式，修复多个事件同时段只触发第一个的问题。新增起床闹钟逻辑。
 *
 * 核心流程：
 * 1. 每30秒扫描所有未触发事件，匹配的加入报警队列
 * 2. 队列中的事件按时间排序，依次触发（上一个关闭后自动显示下一个）
 * 3. 补偿窗口扩展至30分钟，alarmVisible 不再阻止扫描
 * 4. 监听前台通知 + 通知点击，双通道保障
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSchedule } from '../context/ScheduleContext';
import { useSettings } from '../context/SettingsContext';
import { getToday, isInQuietHours } from '../utils/helpers';
import * as Notifier from '../modules/notifier/Notifier';
import { addLog } from '../modules/storage/Database';
import { findMissedEvents } from '../modules/scheduler/NotificationScheduler';

// 补偿窗口：事件开始后 N 分钟内仍可触发（分钟）
const CATCH_UP_WINDOW = 30;

// 队列下一个报警的延迟（ms），给用户短暂缓冲
const QUEUE_NEXT_DELAY = 1500;

export function useAlarmChecker() {
  const { events, loading } = useSchedule();
  const { settings } = useSettings();
  const [alarmEvent, setAlarmEvent] = useState(null);
  const [alarmVisible, setAlarmVisible] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceFinished, setVoiceFinished] = useState(false);
  const triggeredRef = useRef({});          // 今日已触发事件ID集合
  const checkingRef = useRef(false);
  const eventMapRef = useRef({});           // eventId → event 快速索引
  const alarmStopRef = useRef(null);        // playAlarm 返回的 stop 函数
  const hasInteractedRef = useRef(false);   // 用户是否已手动操作
  const alarmQueueRef = useRef([]);         // 待触发的报警队列
  const isDismissingRef = useRef(false);    // 是否正在关闭（防止重复触发队列）
  const alarmsInFlightRef = useRef(new Set()); // 正在处理中的报警事件ID
  const queueTimerRef = useRef(null);       // 队列处理定时器
  const dismissTimerRef = useRef(null);     // 关闭缓冲定时器

  // 维护 eventId → event 的快速索引
  useEffect(() => {
    const map = {};
    for (const e of events) map[e.id] = e;
    eventMapRef.current = map;
  }, [events]);

  // 每天重置已触发记录
  useEffect(() => {
    const t = setInterval(() => {
      const today = getToday();
      if (!triggeredRef.current[today]) triggeredRef.current[today] = new Set();
    }, 60000);
    return () => clearInterval(t);
  }, []);

  // 停止所有提醒（铃声 + 语音 + 振动）
  const stopAlarm = useCallback(() => {
    Vibration.cancel();
    if (alarmStopRef.current) {
      alarmStopRef.current.stop();
      alarmStopRef.current = null;
    }
    Notifier.stopSpeech();
    setVoicePlaying(false);
    setVoiceFinished(false);
  }, []);

  // 唤起弹窗：铃声 + 振动 + 语音 + 弹窗
  // options: { isWakeUp?: boolean } — 起床闹钟标记
  const triggerAlarm = useCallback(async (event, options = {}) => {
    const today = getToday();
    const todayTriggered = triggeredRef.current[today] || new Set();
    const isWakeUp = options.isWakeUp === true;

    // 防止同一事件被重复触发（起床闹钟每天只触发一次）
    if (!isWakeUp && todayTriggered.has(event.id)) return;
    if (alarmsInFlightRef.current.has(event.id)) return;

    todayTriggered.add(event.id);
    alarmsInFlightRef.current.add(event.id);

    stopAlarm();
    hasInteractedRef.current = false;

    const quietStart = settings.quietStartTime || '23:00';
    const quietEnd = settings.quietEndTime || '06:00';
    const inQuiet = isInQuietHours(quietStart, quietEnd);
    const ttsOn = settings.ttsEnabled !== false;

    // 起床闹钟不受静默时段限制
    if (!isWakeUp && inQuiet) {
      addLog(event.id, 'triggered_quiet', '静默时段').catch(() => {});
      alarmsInFlightRef.current.delete(event.id);
      return;
    }

    // 1. 显示弹窗
    setAlarmEvent(event);
    setAlarmVisible(true);
    setVoicePlaying(false);
    setVoiceFinished(false);

    // 2. 播放闹铃（根据事件类型选择音频）
    const forceVol = settings.forceVolumeInSilent === true;
    const soundType = isWakeUp
      ? 'clock'  // 起床闹钟始终使用长音频
      : (settings.reminderSoundType || 'alarm');  // 日程提醒使用用户选择的类型
    const vol = isWakeUp
      ? Number(settings.wakeUpVolume) || 0.9
      : (forceVol ? 1.0 : Number(settings.alarmVolume) || 0.8);

    try {
      const alarmCtrl = await Notifier.playAlarm({
        volume: vol,
        soundType,
        loop: true,
      });
      alarmStopRef.current = alarmCtrl;
    } catch (e) {
      console.warn('闹铃播放失败，使用振动代替:', e);
    }

    // 3. 启动 TTS 语音播报
    // 起床闹钟：播报当日日程摘要
    if (isWakeUp) {
      // 起床闹钟播报特殊语音
      if (ttsOn) {
        setVoicePlaying(true);
        const now = new Date();
        const timeStr = `${now.getHours()}点${now.getMinutes()}分`;
        const text = `早上好！现在是${timeStr}，该起床了。${event.title || '祝你今天一切顺利！'}`;
        try {
          const Speech = require('expo-speech');
          await Speech.stop();
          Speech.speak(text, {
            language: 'zh-CN',
            pitch: 1.0,
            rate: Number(settings.ttsRate) || 1.0,
            volume: 1.0,
            onStart: () => setVoicePlaying(true),
            onDone: () => {
              setVoicePlaying(false);
              setVoiceFinished(true);
            },
            onError: () => {
              setVoicePlaying(false);
              setVoiceFinished(true);
            },
          });
        } catch (e) {
          setVoicePlaying(false);
          setVoiceFinished(true);
        }
      } else {
        setVoiceFinished(true);
      }
    } else if (ttsOn) {
      setVoicePlaying(true);
      Notifier.speakEvent(event, {
        rate: Number(settings.ttsRate) || 1.0,
        onStart: () => {
          setVoicePlaying(true);
        },
        onDone: () => {
          setVoicePlaying(false);
          setVoiceFinished(true);
        },
        onError: () => {
          setVoicePlaying(false);
          setVoiceFinished(true);
        },
      });
    } else {
      setVoiceFinished(true);
    }
  }, [settings, stopAlarm]);

  // ---- 处理队列中的下一个报警 ----
  const processNextInQueue = useCallback(() => {
    const queue = alarmQueueRef.current;
    if (queue.length === 0) return;

    // 过滤掉已经在处理中的事件
    while (queue.length > 0) {
      const next = queue[0];
      if (alarmsInFlightRef.current.has(next.id)) {
        queue.shift();
        continue;
      }
      break;
    }

    if (queue.length === 0) return;

    const nextEvent = queue.shift();
    // 清理旧定时器
    if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    queueTimerRef.current = setTimeout(() => {
      queueTimerRef.current = null;
      triggerAlarm(nextEvent);
    }, QUEUE_NEXT_DELAY);
  }, [triggerAlarm]);

  // ---- 监听通知点击（从熄屏/锁屏点击通知进入 App）----
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification?.request?.content?.data;
      if (!data?.eventId) return;
      const event = eventMapRef.current[data.eventId];
      if (event) {
        // 如果当前有报警显示中，加入队列
        if (alarmVisible) {
          alarmQueueRef.current.push(event);
        } else {
          triggerAlarm(event);
        }
      } else if (data.title) {
        const syntheticEvent = {
          id: data.eventId,
          title: data.title,
          content: data.content || '',
          phase: data.phase || '',
          start_time: data.startTime || '',
          end_time: data.endTime || '',
          date: getToday(),
        };
        if (alarmVisible) {
          alarmQueueRef.current.push(syntheticEvent);
        } else {
          triggerAlarm(syntheticEvent);
        }
      }
    });
    return () => sub.remove();
  }, [triggerAlarm, alarmVisible]);

  // ---- 前台定时扫描 ----
  useEffect(() => {
    if (loading || checkingRef.current) return;

    const check = async () => {
      checkingRef.current = true;
      try {
        const now = new Date();
        const today = getToday();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const advance = Number(settings.advanceMinutes) || 0;

        // 初始化今日触发记录
        if (!triggeredRef.current[today]) triggeredRef.current[today] = new Set();
        const todayTriggered = triggeredRef.current[today];

        // ---- 起床闹钟检查 ----
        const wakeUpEnabled = settings.wakeUpEnabled === true;
        const wakeUpTime = settings.wakeUpTime || '07:00';
        const wakeUpKey = `wakeup_${today}`;

        if (wakeUpEnabled && !todayTriggered.has(wakeUpKey)) {
          const [wh, wm] = wakeUpTime.split(':').map(Number);
          if (!isNaN(wh) && !isNaN(wm)) {
            const wakeUpMin = wh * 60 + wm;
            // 在起床时间±2分钟内触发
            if (currentMin >= wakeUpMin && currentMin <= wakeUpMin + 2) {
              todayTriggered.add(wakeUpKey);
              // 收集今日日程作为摘要
              const todayEvents = events.filter((e) => e.date === today && e.enabled === 1);
              const summary = todayEvents.length > 0
                ? `今天共有${todayEvents.length}个日程，${todayEvents.map((e) => e.start_time + ' ' + e.title).join('，')}`
                : '今天没有安排日程，享受美好的一天吧！';
              triggerAlarm({
                id: wakeUpKey,
                title: summary,
                content: '',
                phase: '起床闹钟',
                start_time: wakeUpTime,
                end_time: null,
                date: today,
              }, { isWakeUp: true });
            }
          }
        }

        // ---- 日程事件检查 ----

        if (!triggeredRef.current[today]) triggeredRef.current[today] = new Set();
        const todayTriggered = triggeredRef.current[today];

        const matchedEvents = [];

        for (const e of events) {
          if (e.date !== today) continue;
          if (!e.enabled || e.completed === 1) continue;
          if (todayTriggered.has(e.id)) continue;
          if (alarmsInFlightRef.current.has(e.id)) continue;

          const [h, m] = (e.start_time || '').split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;
          const eventMin = h * 60 + m;
          const triggerMin = eventMin - advance;

          // 扩展补偿窗口到30分钟
          if (currentMin >= triggerMin && currentMin <= eventMin + CATCH_UP_WINDOW) {
            matchedEvents.push(e);
          }
        }

        // 按开始时间排序
        matchedEvents.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

        for (const e of matchedEvents) {
          if (todayTriggered.has(e.id)) continue;
          if (alarmsInFlightRef.current.has(e.id)) continue;

          // 如果当前无报警显示，直接触发
          if (!alarmVisible && alarmQueueRef.current.length === 0) {
            triggerAlarm(e);
          } else {
            // 否则加入队列（去重）
            const alreadyQueued = alarmQueueRef.current.some((q) => q.id === e.id);
            if (!alreadyQueued) {
              alarmQueueRef.current.push(e);
            }
          }
        }

        // 补偿检查：使用 findMissedEvents 查找遗漏事件
        try {
          const missed = findMissedEvents(events);
          for (const e of missed) {
            if (todayTriggered.has(e.id)) continue;
            if (alarmsInFlightRef.current.has(e.id)) continue;
            const alreadyQueued = alarmQueueRef.current.some((q) => q.id === e.id);
            if (!alreadyQueued) {
              alarmQueueRef.current.push(e);
            }
          }
        } catch (e) {
          // 补偿检查失败不影响主流程
        }
      } catch (e) {
        console.warn('闹钟检查异常:', e);
      } finally {
        checkingRef.current = false;
      }
    };

    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [events, loading, settings, alarmVisible, triggerAlarm]);

  // 关闭弹窗（停止铃声/语音，自动处理队列中的下一个）
  const dismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    stopAlarm();

    // 清除当前事件
    if (alarmEvent) {
      alarmsInFlightRef.current.delete(alarmEvent.id);
    }

    setAlarmVisible(false);
    setAlarmEvent(null);

    // 短暂延迟后处理队列中的下一个报警
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      isDismissingRef.current = false;
      processNextInQueue();
    }, QUEUE_NEXT_DELAY);
  }, [stopAlarm, alarmEvent, processNextInQueue]);

  // 用户手动操作（开始/稍后/跳过）
  const markInteracted = useCallback(() => {
    hasInteractedRef.current = true;
  }, []);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      stopAlarm();
    };
  }, [stopAlarm]);

  // 暴露当前队列长度（供调试/UI显示）
  const queueLength = alarmQueueRef.current.length;

  return {
    alarmEvent,
    alarmVisible,
    voicePlaying,
    voiceFinished,
    triggerAlarm,
    dismiss,
    markInteracted,
    isInteracted: () => hasInteractedRef.current,
    queueLength,
  };
}
