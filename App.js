/**
 * 小舒日程闹钟 - 应用根组件
 */
import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScheduleProvider, useSchedule } from './src/context/ScheduleContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useNotifications } from './src/hooks/useNotifications';
import { useAlarmChecker } from './src/hooks/useAlarmChecker';
import ReminderModal from './src/components/ReminderModal';
import { addLog } from './src/modules/storage/Database';
import * as NotificationScheduler from './src/modules/scheduler/NotificationScheduler';
import { getToday } from './src/utils/helpers';
import { initLocale } from './src/i18n';

function AppContent() {
  // 初始化语言设置
  useEffect(() => { initLocale(); }, []);

  const { permissionGranted, registerForegroundHandler } = useNotifications();
  const schedule = useSchedule();
  const {
    alarmEvent,
    alarmVisible,
    voicePlaying,
    voiceFinished,
    dismiss,
    markInteracted,
    triggerAlarm,
    queueLength,
  } = useAlarmChecker();

  // 将 useAlarmChecker 的 triggerAlarm 注册为前台通知处理器
  const eventMapRef = useRef({});
  useEffect(() => {
    const map = {};
    for (const e of schedule.events) map[e.id] = e;
    eventMapRef.current = map;
  }, [schedule.events]);

  useEffect(() => {
    registerForegroundHandler((data) => {
      const event = eventMapRef.current[data.eventId];
      if (event) {
        triggerAlarm(event);
      } else if (data.title) {
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
  }, [registerForegroundHandler, triggerAlarm]);

  const onAlarmAction = async (action, event) => {
    markInteracted();
    if (action === 'start') {
      await schedule.completeEvent(event.id);
      await addLog(event.id, 'completed', '用户开始执行');
    } else if (action === 'snooze') {
      const min = event.snoozeMinutes || 5;
      await NotificationScheduler.snoozeEvent(event, min);
      await addLog(event.id, 'snoozed', `推迟 ${min} 分钟`);
    } else if (action === 'skip') {
      await schedule.skipEvent(event.id);
      await addLog(event.id, 'skipped', '用户跳过');
    }
    dismiss();
  };

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
      <ReminderModal
        visible={alarmVisible}
        event={alarmEvent}
        voicePlaying={voicePlaying}
        voiceFinished={voiceFinished}
        onAction={onAlarmAction}
        onClose={dismiss}
      />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ScheduleProvider>
            <AppContent />
          </ScheduleProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
