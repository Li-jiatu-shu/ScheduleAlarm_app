/**
 * useNotifications Hook — 通知权限请求和事件监听
 *
 * 配置高优先级通知频道，支持：
 * - 熄屏时铃声音频播放
 * - 绕过勿扰模式
 * - 锁屏界面显示
 * - 振动反馈
 */
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let notificationSub = null;
    let responseSub = null;

    async function init() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        setPermissionGranted(finalStatus === 'granted');

        if (Platform.OS === 'android') {
          try {
            const channelConfig = {
              name: '日程提醒',
              description: '用于日程任务的闹钟提醒（支持熄屏铃响）',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 300, 200, 300, 200, 300],
              lightColor: '#FF7B9C',
              bypassDnd: true,
              enableVibrate: true,
              sound: 'default',
              showBadge: true,
              enableLights: true,
              lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            };

            // SDK 57+ 支持闹钟音频属性
            if (Notifications.AndroidAudioUsage) {
              channelConfig.audioAttributes = {
                usage: Notifications.AndroidAudioUsage.ALARM,
                contentType: Notifications.AndroidAudioContentType?.SONIFICATION || 2,
                flags: {
                  // 即使音频路由变化也保持播放
                  enforceAudible: true,
                },
              };
            }

            await Notifications.setNotificationChannelAsync(
              'schedule-reminder',
              channelConfig
            );
          } catch (e) {
            console.warn('通知频道配置失败:', e);
          }
        }

        // iOS：请求 critical alert 权限
        if (Platform.OS === 'ios') {
          try {
            await Notifications.setNotificationCategoryAsync('schedule-reminder', [
              {
                identifier: 'start',
                buttonTitle: '开始执行',
                options: { opensAppToForeground: true },
              },
              {
                identifier: 'snooze',
                buttonTitle: '稍后提醒',
                options: { opensAppToForeground: true },
              },
            ]);
          } catch (e) {
            console.warn('iOS 通知类别配置失败:', e);
          }
        }
      } catch (e) {
        console.warn('通知权限初始化失败:', e);
      }
    }

    init();

    notificationSub = Notifications.addNotificationReceivedListener(() => {});
    responseSub = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      if (notificationSub) notificationSub.remove();
      if (responseSub) responseSub.remove();
    };
  }, []);

  return { permissionGranted };
}

export default useNotifications;
