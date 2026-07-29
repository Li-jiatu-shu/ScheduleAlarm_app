/**
 * 通用工具函数
 */

/**
 * 生成 UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间为 HH:mm
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 将 HH:mm 字符串转换为当天的 Date 对象
 * @param {string} timeStr - 格式 HH:mm
 * @param {Date} [baseDate] - 基准日期，默认今天
 * @returns {Date}
 */
export function timeStringToDate(timeStr, baseDate = new Date()) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * 将中文日期字符串转换为 Date 对象
 * 支持：7月27日, 2026年7月27日
 * @param {string} dateStr
 * @param {number} [defaultYear] - 未指定时的默认年份
 * @returns {Date|null}
 */
export function chineseDateToDate(dateStr, defaultYear = 2026) {
  // 移除多余空格
  const cleaned = dateStr.trim().replace(/\s+/g, '');

  // 匹配 "2026年7月27日"
  let match = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  // 匹配 "7月27日"
  match = cleaned.match(/(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(defaultYear, parseInt(match[1]) - 1, parseInt(match[2]));
  }

  return null;
}

/**
 * 生成两个日期之间的所有日期
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string[]} YYYY-MM-DD 格式的日期数组
 */
export function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * 获取两个时间范围之间的分钟差
 * @param {string} startTime - HH:mm
 * @param {string} endTime - HH:mm
 * @returns {number}
 */
export function getMinutesBetween(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // 跨午夜
  return diff;
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD
 */
export function getToday() {
  return formatDate(new Date());
}

/**
 * 获取明天的日期字符串
 * @returns {string} YYYY-MM-DD
 */
export function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

/**
 * 获取昨天的日期字符串
 * @returns {string} YYYY-MM-DD
 */
export function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

/**
 * 将日期字符串加上指定天数
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * 判断当前时间是否在静默时段内
 * @param {string} quietStart - HH:mm
 * @param {string} quietEnd - HH:mm
 * @returns {boolean}
 */
export function isInQuietHours(quietStart, quietEnd) {
  const now = new Date();
  const start = timeStringToDate(quietStart);
  const end = timeStringToDate(quietEnd);

  if (end <= start) {
    // 跨午夜（如 23:00 - 06:00）
    return now >= start || now <= end;
  }
  return now >= start && now <= end;
}

/**
 * 将时间字符串（HH:mm）提前指定分钟数
 * @param {string} timeStr - HH:mm
 * @param {number} minutes
 * @returns {string} HH:mm
 */
export function subtractMinutes(timeStr, minutes) {
  const date = timeStringToDate(timeStr);
  date.setMinutes(date.getMinutes() - minutes);
  return formatTime(date);
}

/**
 * 将时间字符串（HH:mm）延后指定分钟数
 * @param {string} timeStr - HH:mm
 * @param {number} minutes
 * @returns {string} HH:mm
 */
export function addMinutes(timeStr, minutes) {
  const date = timeStringToDate(timeStr);
  date.setMinutes(date.getMinutes() + minutes);
  return formatTime(date);
}

/**
 * 获取星期几的中文名称
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function getChineseWeekday(dateStr) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(dateStr);
  return `周${weekdays[date.getDay()]}`;
}

/**
 * 格式化阶段日期范围显示
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string}
 */
export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

/**
 * 截断文本（用于 TTS 播报）
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 安全地解析 JSON
 * @param {string} jsonStr
 * @param {*} fallback
 * @returns {*}
 */
export function safeJsonParse(jsonStr, fallback = null) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}
