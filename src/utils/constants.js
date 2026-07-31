/**
 * 全局常量定义
 */

// 默认设置值
export const DEFAULT_SETTINGS = {
  // 提醒提前量（分钟）
  advanceMinutes: 0,
  // 静默时段 - 开始时间（HH:mm）
  quietStartTime: '23:00',
  // 静默时段 - 结束时间（HH:mm）
  quietEndTime: '06:00',
  // 是否启用语音播报
  ttsEnabled: true,
  // 语音播报语速 (0.8 - 1.5)
  ttsRate: 1.0,
  // 闹铃音量 (0.0 - 1.0)
  alarmVolume: 0.8,
  // 稍后提醒选项（分钟）
  snoozeOptions: [5, 10, 15],
  // 是否在静音模式下强制播放
  forceVolumeInSilent: false,
  // 闹铃铃声文件名（null 表示使用系统默认）
  ringtoneFile: null,
  // 任务完成时是否自动记录
  autoLogCompletion: true,
  // 每日提醒摘要时间（HH:mm，null 表示关闭）
  dailySummaryTime: null,
  // 起床闹钟
  wakeUpEnabled: false,
  wakeUpTime: '07:00',
  wakeUpSoundType: 'clock',  // 'alarm' | 'clock'
  wakeUpVolume: 0.9,
  // 日程提醒铃声类型
  reminderSoundType: 'alarm',  // 'alarm' | 'clock'
};

// 阶段关键词映射
export const PHASE_KEYWORDS = {
  '基础': { colorKey: 'phaseBase', label: '基础阶段' },
  '强化': { colorKey: 'phaseIntensive', label: '强化阶段' },
  '冲刺': { colorKey: 'phaseSprint', label: '冲刺阶段' },
};

// 数据库名称
export const DB_NAME = 'schedule_alarm.db';

// 数据库版本
export const DB_VERSION = 1;

// 通知频道
export const NOTIFICATION_CHANNEL = 'schedule-reminder';

// 通知频道名称
export const NOTIFICATION_CHANNEL_NAME = '日程提醒';

// 后台任务名称
export const BACKGROUND_TASK_NAME = 'schedule-alarm-background-check';

// 日程解析 - 表格列头标识
export const TABLE_HEADERS = ['时间', '任务安排', '具体内容'];

// 最大通知调度数量（iOS 限制为 64）
export const MAX_SCHEDULED_NOTIFICATIONS = 64;

// 日期格式
export const DATE_FORMAT = 'YYYY-MM-DD';

// 时间格式
export const TIME_FORMAT = 'HH:mm';

// 应用名称
export const APP_NAME = '小舒日程闹钟';

// 支持的导入文件类型
export const SUPPORTED_FILE_TYPES = ['text/markdown', 'text/plain', 'application/octet-stream'];
