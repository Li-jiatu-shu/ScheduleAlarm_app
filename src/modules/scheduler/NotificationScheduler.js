/**
 * 通知调度引擎
 *
 * 使用 expo-notifications 调度本地通知，
 * 支持批量调度、提前提醒、稍后提醒和补偿检查。
 */

import * as Notifications from 'expo-notifications';
import { MAX_SCHEDULED_NOTIFICATIONS } from '../../utils/constants';
import { subtractMinutes, getToday } from '../../utils/helpers';

/**
 * 为事件列表批量调度通知
 * @param {Object[]} events - 事件数组
 * @param {Object} options
 * @param {number} [options.advanceMinutes=0] - 提前提醒分钟数
 * @param {string} [options.quietStart] - 静默时段开始
 * @param {string} [options.quietEnd] - 静默时段结束
 * @param {boolean} [options.ttsEnabled=true] - 是否启用TTS
 * @returns {Promise<string[]>} 已调度的通知ID列表
 */
export async function scheduleEventNotifications(events, options = {}) {
  const {
    advanceMinutes = 0,
    quietStart = '23:00',
    quietEnd = '06:00',
    ttsEnabled = true,
  } = options;

  // 选择性取消：仅取消本次导入事件的旧通知，保留其他事件的通知
  const newEventIds = new Set(events.map((e) => e.id));
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.eventId && newEventIds.has(notification.content.data.eventId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (e) {
    console.warn('选择性取消通知失败，回退到全部取消:', e);
    await cancelAllNotifications();
  }

  const notificationIds = [];
  const today = getToday();

  // 只调度今天及未来的通知，限制最大数量
  const futureEvents = events
    .filter((e) => e.date >= today && e.enabled === 1)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_time.localeCompare(b.start_time);
    })
    .slice(0, MAX_SCHEDULED_NOTIFICATIONS);

  for (const event of futureEvents) {
    try {
      // 计算实际触发时间
      let triggerTime = subtractMinutes(event.start_time, advanceMinutes);

      // 如果触发时间已过，跳过
      if (event.date === today && triggerTime <= getCurrentTimeStr()) {
        continue;
      }

      // 静默时段检查：如果当前处于静默时段，降低通知优先级
      let isQuiet = false;
      try {
        const now = new Date();
        const sh = parseInt(quietStart.split(':')[0]) * 60 + parseInt(quietStart.split(':')[1]);
        const eh = parseInt(quietEnd.split(':')[0]) * 60 + parseInt(quietEnd.split(':')[1]);
        const cm = now.getHours() * 60 + now.getMinutes();
        isQuiet = ttsEnabled && (eh <= sh ? (cm >= sh || cm <= eh) : (cm >= sh && cm <= eh));
      } catch (e) {}

      const notificationId = await scheduleSingleNotification(event, triggerTime, {
        isQuiet,
        ttsEnabled,
      });

      if (notificationId) {
        notificationIds.push(notificationId);
      }
    } catch (err) {
      console.warn(`调度事件 ${event.id} 通知失败:`, err);
    }
  }

  return notificationIds;
}

/**
 * 调度单个事件的通知
 * @param {Object} event
 * @param {string} triggerTime - HH:mm 格式的触发时间
 * @param {Object} options
 * @returns {Promise<string|null>}
 */
async function scheduleSingleNotification(event, triggerTime, options = {}) {
  const { isQuiet = false, ttsEnabled = true } = options;

  // 解析触发时间
  const [hours, minutes] = triggerTime.split(':').map(Number);
  const eventDate = new Date(event.date);
  const triggerDate = new Date(eventDate);
  triggerDate.setHours(hours, minutes, 0, 0);

  // 如果触发时间已过，不调度
  if (triggerDate <= new Date()) {
    return null;
  }

  const bodyParts = [
    event.phase ? `[${event.phase}]` : '',
    event.start_time || '',
    event.title,
    event.content || '',
  ].filter(Boolean);
  const body = bodyParts.length > 0 ? bodyParts.join(' — ').substring(0, 200) : '任务即将开始';

  const content = {
    title: event.title,
    body,
    sound: isQuiet ? undefined : 'default',
    priority: isQuiet ? 'default' : 'max',
    data: {
      eventId: event.id,
      title: event.title,
      content: event.content,
      phase: event.phase,
      startTime: event.start_time,
      endTime: event.end_time,
      ttsEnabled: ttsEnabled,
      isQuiet: isQuiet,
      type: 'schedule-reminder',
    },
    categoryIdentifier: 'schedule-reminder',
    badge: 1,
    sticky: !isQuiet,
    autoDismiss: isQuiet,
  };

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  } catch (err) {
    console.warn('scheduleNotificationAsync 失败:', err);
    return null;
  }
}

/**
 * 稍后提醒（延迟通知）
 * @param {Object} event - 原始事件
 * @param {number} delayMinutes - 延迟分钟数（5/10/15）
 * @returns {Promise<string|null>}
 */
export async function snoozeEvent(event, delayMinutes = 5) {
  const triggerDate = new Date();
  triggerDate.setMinutes(triggerDate.getMinutes() + delayMinutes);

  const content = {
    title: `[稍后提醒] ${event.title || event.data?.title}`,
    body: event.content
      ? event.content.substring(0, 200)
      : '任务即将开始',
    sound: 'default',
    priority: 'max',
    data: {
      ...(event.data || {}),
      isSnooze: true,
      type: 'schedule-reminder',
    },
    categoryIdentifier: 'schedule-reminder',
    sticky: true,
    autoDismiss: false,
  };

  try {
    return await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch (err) {
    console.warn('稍后提醒调度失败:', err);
    return null;
  }
}

/**
 * 取消特定事件的通知
 * @param {string} eventId
 */
export async function cancelEventNotification(eventId) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.eventId === eventId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (err) {
    console.warn('取消通知失败:', err);
  }
}

/**
 * 取消所有已调度的通知
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('取消所有通知失败:', err);
  }
}

/**
 * 获取所有已调度的通知数量
 * @returns {Promise<number>}
 */
export async function getScheduledCount() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}

/**
 * 补偿检查：检查当前时间前后30分钟内是否有未触发的任务
 * v1.2.1: 窗口从±5分钟扩展至±30分钟，覆盖报警可见期间的遗漏事件
 * @param {Object[]} events - 今日事件列表
 * @returns {Object[]} 需要补偿触发的事件
 */
export function findMissedEvents(events) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

  return events.filter((event) => {
    // 只检查今日未完成的事件
    if (event.completed === 1) return false;
    if (event.date !== today) return false;

    const [h, m] = (event.start_time || '').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const eventTime = new Date(event.date);
    eventTime.setHours(h, m, 0, 0);

    return eventTime >= thirtyMinAgo && eventTime <= thirtyMinLater;
  });
}

/**
 * 获取当前时间字符串
 * @returns {string} HH:mm
 */
function getCurrentTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default {
  scheduleEventNotifications,
  snoozeEvent,
  cancelEventNotification,
  cancelAllNotifications,
  getScheduledCount,
  findMissedEvents,
};
