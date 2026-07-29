/**
 * 小舒日程闹钟 - 应用根组件
 */
import React from 'react';
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

function AppContent() {
  useNotifications();
  const schedule = useSchedule();
  const {
    alarmEvent,
    alarmVisible,
    voicePlaying,
    voiceFinished,
    dismiss,
    markInteracted,
  } = useAlarmChecker();

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
