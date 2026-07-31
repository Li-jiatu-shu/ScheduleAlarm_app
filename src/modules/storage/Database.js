/**
 * 存储模块（AsyncStorage 版）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../../utils/constants';

const KEYS = {
  EVENTS: '@schedule_events',
  SETTINGS: '@schedule_settings',
  LOGS: '@schedule_logs',
  TEMPLATES: '@schedule_templates',
  COUNTDOWNS: '@schedule_countdowns',
  SCHEDULE_SETS: '@schedule_sets',
  ACTIVE_SCHEDULE_SET: '@active_schedule_set',
};

let initialized = false;

// ---- 数据规范化（兼容旧 camelCase → snake_case） ----

function normalizeEvent(e) {
  return {
    id: e.id || '',
    phase: e.phase || '未分类',
    date: e.date || '',
    start_time: e.start_time || e.startTime || '',
    end_time: e.end_time || e.endTime || null,
    title: e.title || '',
    content: e.content || '',
    repeat: e.repeat || false,
    enabled: e.enabled === true || e.enabled === 1 || e.enabled === '1' ? 1 : 0,
    completed: e.completed || 0,
    completed_at: e.completed_at || e.completedAt || null,
  };
}

async function readEvents() {
  const raw = await AsyncStorage.getItem(KEYS.EVENTS);
  if (!raw) return [];
  return JSON.parse(raw).map(normalizeEvent);
}

async function writeEvents(events) {
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
}

// ---- 初始化 ----

export async function initDatabase() {
  if (initialized) return;
  const events = await AsyncStorage.getItem(KEYS.EVENTS);
  if (!events) await writeEvents([]);
  const settings = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!settings) await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  const logs = await AsyncStorage.getItem(KEYS.LOGS);
  if (!logs) await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify([]));
  const templates = await AsyncStorage.getItem(KEYS.TEMPLATES);
  if (!templates) await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify([]));
  const countdowns = await AsyncStorage.getItem(KEYS.COUNTDOWNS);
  if (!countdowns) await AsyncStorage.setItem(KEYS.COUNTDOWNS, JSON.stringify([]));
  initialized = true;
}

// ---- Events CRUD ----

/**
 * 合并导入事件：相同时段+时间+标题的更新内容，新的追加，保留完成状态
 * @param {Object[]} newEvents - 新事件数组
 */
export async function upsertEvents(newEvents) {
  const existing = await readEvents();
  const existingMap = new Map();
  for (const e of existing) {
    const key = `${e.date}_${e.start_time}_${e.title}`;
    existingMap.set(key, e);
  }
  for (const ne of newEvents) {
    const key = `${ne.date}_${ne.start_time}_${ne.title}`;
    if (existingMap.has(key)) {
      // 合并：更新可变字段，保留完成状态
      const old = existingMap.get(key);
      Object.assign(old, {
        phase: ne.phase,
        end_time: ne.end_time,
        content: ne.content,
        repeat: ne.repeat,
        updated_at: new Date().toISOString(),
      });
    } else {
      existingMap.set(key, { ...ne, updated_at: new Date().toISOString() });
    }
  }
  await writeEvents(Array.from(existingMap.values()));
}

/**
 * 导入日程（默认为合并模式，不会删除已有日程）
 * @param {Object[]} events - 事件数组
 * @param {Object} [options] - 选项
 * @param {boolean} [options.clearFirst] - 是否先清除所有已有数据再导入
 */
export async function importEvents(events, options = {}) {
  if (options.clearFirst) {
    await writeEvents(events);
  } else {
    await upsertEvents(events);
  }
}

export async function getEventsByDate(date) {
  const events = await readEvents();
  return events
    .filter((e) => e.date === date)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
}

export async function getEventsByDateRange(startDate, endDate) {
  const events = await readEvents();
  return events
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')));
}

export async function getEventById(id) {
  const events = await readEvents();
  return events.find((e) => e.id === id) || null;
}

export async function updateEvent(id, updates) {
  const events = await readEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) events[index][key] = value;
  }
  events[index].updated_at = new Date().toISOString();
  await writeEvents(events);
}

export async function completeEvent(id) {
  await updateEvent(id, { completed: 1, completed_at: new Date().toISOString() });
}

export async function skipEvent(id) {
  await updateEvent(id, { completed: 0, completed_at: null });
}

export async function resetEvent(id) {
  await updateEvent(id, { completed: 0, completed_at: null });
}

export async function deleteEvent(id) {
  const events = await readEvents();
  await writeEvents(events.filter((e) => e.id !== id));
}

export async function getAllPhases() {
  const events = await readEvents();
  const phases = [...new Set(events.map((e) => e.phase))];
  return phases.sort();
}

export async function getPhaseStats() {
  const events = await readEvents();
  const stats = {};
  for (const e of events) {
    if (!stats[e.phase]) stats[e.phase] = { phase: e.phase, total: 0, completed_count: 0 };
    stats[e.phase].total++;
    if (e.completed === 1) stats[e.phase].completed_count++;
  }
  return Object.values(stats);
}

// ---- Settings CRUD ----

export async function getSetting(key, defaultValue = null) {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return defaultValue;
  const settings = JSON.parse(raw);
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

export async function setSetting(key, value) {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  const settings = raw ? JSON.parse(raw) : {};
  settings[key] = value;
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getAllSettings() {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

// ---- Logs CRUD ----

export async function addLog(eventId, action, details = '') {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  const logs = raw ? JSON.parse(raw) : [];
  logs.unshift({
    id: Date.now().toString(),
    event_id: eventId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
  if (logs.length > 500) logs.length = 500;
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export async function getRecentLogs(limit = 50) {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  if (!raw) return [];
  const logs = JSON.parse(raw);
  const events = await readEvents();
  const eventMap = {};
  for (const e of events) eventMap[e.id] = e.title;
  return logs.slice(0, limit).map((log) => ({
    ...log,
    event_title: eventMap[log.event_id] || null,
  }));
}

export async function getEventLogs(eventId) {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  if (!raw) return [];
  return JSON.parse(raw).filter((l) => l.event_id === eventId);
}

// ---- 统计查询 ----

export async function getCompletionStats(startDate, endDate) {
  const events = await readEvents();
  const filtered = events.filter(
    (e) => e.date >= startDate && e.date <= endDate && e.enabled === 1
  );
  return {
    total: filtered.length,
    completed: filtered.filter((e) => e.completed === 1).length,
    pending: filtered.filter((e) => e.completed !== 1).length,
  };
}

export async function getDailyStats(startDate, endDate) {
  const events = await readEvents();
  const filtered = events.filter(
    (e) => e.date >= startDate && e.date <= endDate && e.enabled === 1
  );
  const stats = {};
  for (const e of filtered) {
    if (!stats[e.date]) stats[e.date] = { date: e.date, total: 0, completed: 0 };
    stats[e.date].total++;
    if (e.completed === 1) stats[e.date].completed++;
  }
  return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));
}

// ---- 数据管理 ----

export async function clearAllData() {
  await writeEvents([]);
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify([]));
  await writeTemplates([]);
  await writeCountdowns([]);
}

// ---- 日程模板管理（一次导入，每日自动生成） ----

async function readTemplates() {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  if (!raw) return [];
  return JSON.parse(raw);
}

async function writeTemplates(templates) {
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
}

/**
 * 保存日程模板（导入时调用）
 * 模板与事件分开存储，不含具体日期，作为每日事件生成的蓝本。
 * @param {Object[]} templates - 模板数组
 */
export async function saveScheduleTemplates(templates) {
  const existing = await readTemplates();
  const templateMap = new Map();
  for (const t of existing) {
    const key = `${t.phase}_${t.startTime}_${t.title}`;
    templateMap.set(key, t);
  }
  for (const t of templates) {
    const normalized = {
      id: t.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phase: t.phase || '未分类',
      startTime: t.startTime || t.start_time || '',
      endTime: t.endTime || t.end_time || null,
      title: t.title || '',
      content: t.content || '',
      enabled: t.enabled === false || t.enabled === 0 ? 0 : 1,
    };
    const key = `${normalized.phase}_${normalized.startTime}_${normalized.title}`;
    if (templateMap.has(key)) {
      Object.assign(templateMap.get(key), {
        ...normalized,
        updated_at: new Date().toISOString(),
      });
    } else {
      templateMap.set(key, {
        ...normalized,
        created_at: new Date().toISOString(),
      });
    }
  }
  await writeTemplates(Array.from(templateMap.values()));
}

/**
 * 获取所有日程模板
 * @returns {Promise<Object[]>}
 */
export async function getScheduleTemplates() {
  return await readTemplates();
}

/**
 * 从模板为指定日期生成事件（如该日期已有事件则跳过）
 * @param {string} date - 日期 YYYY-MM-DD
 * @returns {Promise<Object[]>} 新生成的事件
 */
export async function generateEventsFromTemplates(date) {
  const templates = await readTemplates();
  if (templates.length === 0) return [];

  const existing = await readEvents();
  const hasEventsForDate = existing.some((e) => e.date === date);
  if (hasEventsForDate) return [];

  const newEvents = templates
    .filter((t) => t.enabled === 1 || t.enabled === true)
    .map((t) => ({
      id: `${date}_${t.startTime}_${t.title}`.replace(/[^a-zA-Z0-9\-_]/g, '_'),
      phase: t.phase,
      date,
      start_time: t.startTime,
      end_time: t.endTime || null,
      title: t.title,
      content: t.content,
      repeat: 1,
      enabled: 1,
      completed: 0,
      completed_at: null,
    }));

  if (newEvents.length > 0) {
    const allEvents = await readEvents();
    await writeEvents([...allEvents, ...newEvents]);
  }
  return newEvents;
}

/**
 * 检查并补全未来N天的每日事件
 * 应用启动时调用，确保未来日程不中断。
 * @param {number} [daysAhead=7] - 向前补全天数
 * @returns {Promise<number>} 新生成事件数
 */
export async function ensureFutureEvents(daysAhead = 7) {
  const templates = await readTemplates();
  if (templates.length === 0) return 0;

  const today = new Date();
  let totalGenerated = 0;

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const generated = await generateEventsFromTemplates(dateStr);
    totalGenerated += generated.length;
  }
  return totalGenerated;
}

/**
 * 清除所有模板
 */
export async function clearTemplates() {
  await writeTemplates([]);
}

// ---- 倒计时管理 ----

async function readCountdowns() {
  const raw = await AsyncStorage.getItem(KEYS.COUNTDOWNS);
  if (!raw) return [];
  return JSON.parse(raw);
}

async function writeCountdowns(countdowns) {
  await AsyncStorage.setItem(KEYS.COUNTDOWNS, JSON.stringify(countdowns));
}

export async function getCountdowns() {
  return await readCountdowns();
}

export async function addCountdown(countdown) {
  const list = await readCountdowns();
  const newItem = {
    id: countdown.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: countdown.title || '',
    targetDate: countdown.targetDate || '',
    type: countdown.type || 'other',
    color: countdown.color || '#FF7B9C',
    emoji: countdown.emoji || '📅',
    notifyDays: countdown.notifyDays || [],
    enabled: countdown.enabled !== false ? 1 : 0,
    createdAt: countdown.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(newItem);
  await writeCountdowns(list);
  return newItem;
}

export async function updateCountdown(id, updates) {
  const list = await readCountdowns();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
  await writeCountdowns(list);
  return list[index];
}

export async function deleteCountdown(id) {
  const list = await readCountdowns();
  await writeCountdowns(list.filter((c) => c.id !== id));
}

// ---- 日程方案管理（多套日程切换） ----

async function readScheduleSets() {
  const raw = await AsyncStorage.getItem(KEYS.SCHEDULE_SETS);
  if (!raw) return {};
  return JSON.parse(raw);
}

async function writeScheduleSets(sets) {
  await AsyncStorage.setItem(KEYS.SCHEDULE_SETS, JSON.stringify(sets));
}

/**
 * 获取所有日程方案
 * @returns {Promise<Object>} { setName: { name, events, templates, createdAt } }
 */
export async function getScheduleSets() {
  return await readScheduleSets();
}

/**
 * 保存当前日程为命名方案
 * @param {string} name - 方案名称
 */
export async function saveCurrentAsScheduleSet(name) {
  const sets = await readScheduleSets();
  const events = await readEvents();
  const templates = await readTemplates();
  sets[name] = {
    name,
    events,
    templates,
    savedAt: new Date().toISOString(),
  };
  await writeScheduleSets(sets);
}

/**
 * 加载指定日程方案（替换当前所有事件和模板）
 * @param {string} name - 方案名称
 */
export async function loadScheduleSet(name) {
  const sets = await readScheduleSets();
  const set = sets[name];
  if (!set) throw new Error(`方案 "${name}" 不存在`);
  await writeEvents(set.events || []);
  await writeTemplates(set.templates || []);
  await AsyncStorage.setItem(KEYS.ACTIVE_SCHEDULE_SET, name);
}

/**
 * 删除指定日程方案
 * @param {string} name - 方案名称
 */
export async function deleteScheduleSet(name) {
  const sets = await readScheduleSets();
  delete sets[name];
  await writeScheduleSets(sets);
}

/**
 * 获取当前活跃的日程方案名称
 * @returns {Promise<string|null>}
 */
export async function getActiveScheduleSet() {
  return await AsyncStorage.getItem(KEYS.ACTIVE_SCHEDULE_SET) || null;
}

export async function closeDatabase() {
  initialized = false;
}

export default {
  initDatabase, importEvents, upsertEvents, getEventsByDate, getEventsByDateRange,
  getEventById, updateEvent, completeEvent, skipEvent, resetEvent,
  deleteEvent, getAllPhases, getPhaseStats, getSetting, setSetting,
  getAllSettings, addLog, getRecentLogs, getEventLogs,
  getCompletionStats, getDailyStats, clearAllData, clearTemplates, closeDatabase,
  saveScheduleTemplates, getScheduleTemplates, generateEventsFromTemplates, ensureFutureEvents,
  getCountdowns, addCountdown, updateCountdown, deleteCountdown,
  getScheduleSets, saveCurrentAsScheduleSet, loadScheduleSet, deleteScheduleSet, getActiveScheduleSet,
};
