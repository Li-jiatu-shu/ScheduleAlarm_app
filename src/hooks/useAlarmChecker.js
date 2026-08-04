/**
 * useAlarmChecker — 前台定时提醒 + 通知点击唤起弹窗 + 报警队列
 *
 * v1.4.0: 每日自动重调度通知，时段智能铃声选择，强力铃声时段支持，午休闹钟
 *
 * 核心流程：
 * 1. 每30秒扫描所有未触发事件，匹配的加入报警队列
 * 2. 队列中的事件按时间排序，依次触发（上一个关闭后自动显示下一个）
 * 3. 补偿窗口扩展至30分钟，alarmVisible 不再阻止扫描
 * 4. 监听前台通知 + 通知点击，双通道保障
 * 5. 每日午夜自动重调度未来7天通知，确保提醒永久有效
 * 6. 根据当前时间自动选择铃声类型：强力铃声时段用 clock/custom，其余用 alarm
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Vibration, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSchedule } from '../context/ScheduleContext';
import { useSettings } from '../context/SettingsContext';
import { getToday, isInQuietHours, parseEventTime } from '../utils/helpers';
import * as Notifier from '../modules/notifier/Notifier';
import { addLog, getEventsByDateRange } from '../modules/storage/Database';
import {
  findMissedEvents,
  scheduleEventNotifications,
  cancelAllNotifications,
} from '../modules/scheduler/NotificationScheduler';

// 补偿窗口：事件开始后 N 分钟内仍可触发（分钟）
const CATCH_UP_WINDOW = 30;

// 队列下一个报警的延迟（ms），给用户短暂缓冲
const QUEUE_NEXT_DELAY = 1500;

// 每日重调度检查间隔（1小时）
const RESCHEDULE_INTERVAL = 60 * 60 * 1000;

/**
 * 判断当前时间是否在强力铃声时段内
 * @param {Array} slots - [{ start: 'HH:mm', end: 'HH:mm' }]
 * @returns {boolean}
 */
function isInStrongRingtoneSlot(slots) {
  if (!slots || !Array.isArray(slots) || slots.length === 0) return false;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (const slot of slots) {
    const [sh, sm] = (slot.start || '00:00').split(':').map(Number);
    const [eh, em] = (slot.end || '00:00').split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) continue;

    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    // 跨午夜时段的处理
    if (endMin <= startMin) {
      if (currentMin >= startMin || currentMin <= endMin) return true;
    } else {
      if (currentMin >= startMin && currentMin <= endMin) return true;
    }
  }
  return false;
}

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
  const lastRescheduleDateRef = useRef(''); // 上次重调度的日期
  const lastRescheduleHourRef = useRef(-1); // 上次重调度的小时

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

  // ---- 每日重调度通知（确保提醒永久有效） ----
  const rescheduleNotifications = useCallback(async () => {
    try {
      const today = getToday();
      // 每天至少重调度一次（日期变化时），或每小时补充一次
      const now = new Date();
      const currentHour = now.getHours();

      if (lastRescheduleDateRef.current === today && lastRescheduleHourRef.current === currentHour) {
        return; // 已在本小时内调度过
      }

      lastRescheduleDateRef.current = today;
      lastRescheduleHourRef.current = currentHour;

      // 获取未来30天的事件并重调度
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // 从本地存储获取未来事件
      const futureEvents = await getEventsByDateRange(today, endDateStr);

      if (futureEvents.length > 0) {
        await scheduleEventNotifications(futureEvents, {
          advanceMinutes: Number(settings.advanceMinutes) || 0,
          quietStart: settings.quietStartTime || '23:00',
          quietEnd: settings.quietEndTime || '06:00',
          ttsEnabled: settings.ttsEnabled !== false,
        });
        console.log(`[重调度] 已为 ${futureEvents.length} 个未来事件重调度通知`);
      }
    } catch (e) {
      console.warn('重调度通知失败:', e);
    }
  }, [settings]);

  // 启动时 + 每小时重调度
  useEffect(() => {
    if (loading) return;
    rescheduleNotifications();
    const timer = setInterval(rescheduleNotifications, RESCHEDULE_INTERVAL);
    return () => clearInterval(timer);
  }, [loading, rescheduleNotifications]);

  // App 从后台回到前台时重调度
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // 清除通知栏中所有已显示的通知
        Notifications.dismissAllNotificationsAsync?.().catch(() => {});
        // 短暂延迟后重调度
        setTimeout(() => rescheduleNotifications(), 1000);
      }
    });
    return () => sub.remove();
  }, [rescheduleNotifications]);

  // ---- 铃声类型选择（根据时段智能选择） ----
  const getSoundTypeForCurrentTime = useCallback((isWakeUp = false) => {
    // 起床闹钟和午休闹钟始终使用强力铃声
    if (isWakeUp) {
      const customUri = settings.customRingtoneUri;
      return { soundType: customUri ? 'custom' : 'clock', customUri };
    }

    // 检查是否在强力铃声时段
    const strongSlots = settings.strongRingtoneSlots;
    if (isInStrongRingtoneSlot(strongSlots)) {
      const customUri = settings.customRingtoneUri;
      return { soundType: customUri ? 'custom' : 'clock', customUri };
    }

    // 默认使用短促闹铃
    return { soundType: 'alarm', customUri: null };
  }, [settings.customRingtoneUri, settings.strongRingtoneSlots]);

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
  // options: { isWakeUp?: boolean, isNap?: boolean }
  const triggerAlarm = useCallback(async (event, options = {}) => {
    const today = getToday();
    const todayTriggered = triggeredRef.current[today] || new Set();
    const isWakeUp = options.isWakeUp === true;
    const isNap = options.isNap === true;

    // 防止同一事件被重复触发（特殊闹钟每天只触发一次）
    if (!isWakeUp && !isNap && todayTriggered.has(event.id)) return;
    if (alarmsInFlightRef.current.has(event.id)) return;

    todayTriggered.add(event.id);
    alarmsInFlightRef.current.add(event.id);

    stopAlarm();
    hasInteractedRef.current = false;

    const quietStart = settings.quietStartTime || '23:00';
    const quietEnd = settings.quietEndTime || '06:00';
    const inQuiet = isInQuietHours(quietStart, quietEnd);
    const ttsOn = settings.ttsEnabled !== false;

    // 起床/午休闹钟不受静默时段限制
    if (!isWakeUp && !isNap && inQuiet) {
      addLog(event.id, 'triggered_quiet', '静默时段').catch((e) => console.warn('记录日志失败:', e));
      alarmsInFlightRef.current.delete(event.id);
      return;
    }

    // 1. 显示弹窗
    setAlarmEvent(event);
    setAlarmVisible(true);
    setVoicePlaying(false);
    setVoiceFinished(false);

    // 2. 播放闹铃（根据时段智能选择铃声类型）
    const { soundType, customUri } = getSoundTypeForCurrentTime(isWakeUp || isNap);
    const forceVol = settings.forceVolumeInSilent === true;

    // 音量选择
    let vol;
    if (isWakeUp) {
      vol = Number(settings.wakeUpVolume) || 0.9;
    } else if (isNap) {
      vol = Number(settings.wakeUpVolume) || 0.9; // 午休也用强力音量
    } else if (soundType === 'clock' || soundType === 'custom') {
      vol = forceVol ? 1.0 : Number(settings.wakeUpVolume) || 0.9;
    } else {
      vol = forceVol ? 1.0 : Number(settings.alarmVolume) || 0.8;
    }

    try {
      const alarmCtrl = await Notifier.playAlarm({
        volume: vol,
        soundType,
        customUri,
        loop: true,
      });
      alarmStopRef.current = alarmCtrl;
    } catch (e) {
      console.warn('闹铃播放失败，使用振动代替:', e);
    }

    // 3. 启动 TTS 语音播报
    if (isWakeUp) {
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
    } else if (isNap) {
      if (ttsOn) {
        setVoicePlaying(true);
        const now = new Date();
        const timeStr = `${now.getHours()}点${now.getMinutes()}分`;
        const text = `午休时间到了！现在是${timeStr}，${event.title || '该休息一下了。'}`;
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
  }, [settings, stopAlarm, getSoundTypeForCurrentTime]);

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

        // ---- 午休闹钟检查 ----
        const napEnabled = settings.napAlarmEnabled === true;
        const napTime = settings.napAlarmTime || '13:00';
        const napKey = `nap_${today}`;

        if (napEnabled && !todayTriggered.has(napKey)) {
          const [nh, nm] = napTime.split(':').map(Number);
          if (!isNaN(nh) && !isNaN(nm)) {
            const napMin = nh * 60 + nm;
            if (currentMin >= napMin && currentMin <= napMin + 2) {
              todayTriggered.add(napKey);
              triggerAlarm({
                id: napKey,
                title: '午休时间到啦！该休息一下了 ☀️',
                content: '',
                phase: '午休闹钟',
                start_time: napTime,
                end_time: null,
                date: today,
              }, { isNap: true });
            }
          }
        }

        // ---- 日程事件检查 ----
        const matchedEvents = [];

        for (const e of events) {
          if (e.date !== today) continue;
          if (!e.enabled || e.completed === 1) continue;
          if (todayTriggered.has(e.id)) continue;
          if (alarmsInFlightRef.current.has(e.id)) continue;

          const parsed = parseEventTime(e.start_time);
          if (!parsed) continue;
          const eventMin = parsed.totalMinutes;
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

          if (!alarmVisible && alarmQueueRef.current.length === 0) {
            triggerAlarm(e);
          } else {
            const alreadyQueued = alarmQueueRef.current.some((q) => q.id === e.id);
            if (!alreadyQueued) {
              alarmQueueRef.current.push(e);
            }
          }
        }

        // 补偿检查
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
          console.warn('补偿检查失败（不影响主流程）:', e);
        }

        // ---- 清理过期队列项（超过补偿窗口的事件） ----
        alarmQueueRef.current = alarmQueueRef.current.filter((q) => {
          const parsed = parseEventTime(q.start_time || '');
          if (!parsed) return false;
          const eventMin = parsed.totalMinutes;
          return currentMin <= eventMin + CATCH_UP_WINDOW + 10;
        });
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

  // 关闭弹窗（停止铃声/语音，清除通知栏，自动处理队列中的下一个）
  const dismiss = useCallback(async () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    stopAlarm();

    // 清除当前事件
    if (alarmEvent) {
      alarmsInFlightRef.current.delete(alarmEvent.id);
    }

    setAlarmVisible(false);
    setAlarmEvent(null);

    // 清除通知栏中所有已显示的通知
    try {
      await Notifications.dismissAllNotificationsAsync?.();
    } catch (e) {
      // 静默处理
    }

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
