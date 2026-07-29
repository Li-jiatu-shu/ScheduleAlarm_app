/**
 * useAlarmChecker — 前台定时提醒 + 通知点击唤起弹窗
 *
 * 核心流程：
 * 1. 定时检查当前时间是否匹配任务
 * 2. 匹配时触发：铃声（expo-audio）+ 振动 + TTS语音播报 + 弹窗
 * 3. 语音播报结束后自动进入任务显示（替代原来的5秒倒计时）
 * 4. 监听通知点击（从熄屏/锁屏唤醒后进入 App）
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSchedule } from '../context/ScheduleContext';
import { useSettings } from '../context/SettingsContext';
import { getToday, isInQuietHours } from '../utils/helpers';
import * as Notifier from '../modules/notifier/Notifier';
import { addLog } from '../modules/storage/Database';

export function useAlarmChecker() {
  const { events, loading } = useSchedule();
  const { settings } = useSettings();
  const [alarmEvent, setAlarmEvent] = useState(null);
  const [alarmVisible, setAlarmVisible] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceFinished, setVoiceFinished] = useState(false);
  const triggeredRef = useRef({});
  const checkingRef = useRef(false);
  const eventMapRef = useRef({}); // 快速查找事件
  const alarmStopRef = useRef(null); // playAlarm 返回的 stop 函数
  const hasInteractedRef = useRef(false); // 用户是否已手动操作

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

  // 停止所有提醒
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
  const triggerAlarm = useCallback(async (event) => {
    stopAlarm();
    hasInteractedRef.current = false;

    const quietStart = settings.quietStartTime || '23:00';
    const quietEnd = settings.quietEndTime || '06:00';
    const inQuiet = isInQuietHours(quietStart, quietEnd);
    const ttsOn = settings.ttsEnabled !== false;

    if (inQuiet) {
      addLog(event.id, 'triggered_quiet', '静默时段').catch(() => {});
      return;
    }

    // 1. 先显示弹窗
    setAlarmEvent(event);
    setAlarmVisible(true);
    setVoicePlaying(false);
    setVoiceFinished(false);

    // 2. 播放闹铃（铃声 + 振动）— 同步启动
    const forceVol = settings.forceVolumeInSilent === true;
    const vol = Number(settings.alarmVolume) || 0.8;
    try {
      const alarmCtrl = await Notifier.playAlarm({
        volume: forceVol ? 1.0 : vol,
      });
      alarmStopRef.current = alarmCtrl;
    } catch (e) {
      console.warn('闹铃播放失败，使用振动代替:', e);
    }

    // 3. 启动 TTS 语音播报（带完成回调）
    if (ttsOn) {
      setVoicePlaying(true);
      Notifier.speakEvent(event, {
        rate: Number(settings.ttsRate) || 1.0,
        onStart: () => {
          setVoicePlaying(true);
        },
        onDone: () => {
          // 语音播报完成
          setVoicePlaying(false);
          setVoiceFinished(true);
        },
        onError: () => {
          // 即使出错也标记完成
          setVoicePlaying(false);
          setVoiceFinished(true);
        },
      });
    } else {
      // 未启用 TTS，直接标记语音完成
      setVoiceFinished(true);
    }
  }, [settings, stopAlarm]);

  // ---- 监听通知点击（从熄屏/锁屏点击通知进入 App）----
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification?.request?.content?.data;
      if (!data?.eventId) return;
      // 从索引中找事件
      const event = eventMapRef.current[data.eventId];
      if (event) {
        triggerAlarm(event);
      } else if (data.title) {
        // 兜底：用通知携带的数据构造事件对象
        triggerAlarm({
          id: data.eventId,
          title: data.title,
          content: data.content || '',
          phase: data.phase || '',
          start_time: data.startTime || '',
          end_time: data.endTime || '',
          date: getToday(),
        });
      }
    });
    return () => sub.remove();
  }, [triggerAlarm]);

  // ---- 前台定时检查 ----
  useEffect(() => {
    if (loading || checkingRef.current) return;

    const check = async () => {
      if (alarmVisible) return;
      checkingRef.current = true;
      try {
        const now = new Date();
        const today = getToday();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const advance = Number(settings.advanceMinutes) || 0;
        const quietStart = settings.quietStartTime || '23:00';
        const quietEnd = settings.quietEndTime || '06:00';

        if (!triggeredRef.current[today]) triggeredRef.current[today] = new Set();
        const todayTriggered = triggeredRef.current[today];

        for (const e of events) {
          if (e.date !== today) continue;
          if (!e.enabled || e.completed === 1) continue;
          if (todayTriggered.has(e.id)) continue;

          const [h, m] = (e.start_time || '').split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;
          const eventMin = h * 60 + m;
          const triggerMin = eventMin - advance;

          if (currentMin >= triggerMin && currentMin <= eventMin + 2) {
            todayTriggered.add(e.id);
            triggerAlarm(e);
            break;
          }
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

  // 关闭弹窗（同时停止铃声和语音）
  const dismiss = useCallback(() => {
    stopAlarm();
    setAlarmVisible(false);
    setAlarmEvent(null);
  }, [stopAlarm]);

  // 用户手动操作（开始/稍后/跳过）
  const markInteracted = useCallback(() => {
    hasInteractedRef.current = true;
  }, []);

  return {
    alarmEvent,
    alarmVisible,
    voicePlaying,
    voiceFinished,
    triggerAlarm,
    dismiss,
    markInteracted,
    isInteracted: () => hasInteractedRef.current,
  };
}
