/**
 * 日程数据全局状态管理
 *
 * 提供日程事件的数据访问和操作方法，
 * 所有组件通过此 Context 获取和修改日程数据。
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Database from '../modules/storage/Database';
import * as NotificationScheduler from '../modules/scheduler/NotificationScheduler';
import { getToday } from '../utils/helpers';

const ScheduleContext = createContext(null);

export function ScheduleProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(getToday());
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // 初始化数据库
  useEffect(() => {
    async function init() {
      try {
        await Database.initDatabase();
        setDbReady(true);
      } catch (err) {
        setError('数据库初始化失败: ' + err.message);
        setLoading(false);
      }
    }
    init();
  }, []);

  // 数据库就绪后：初始化流程（模板生成 → 加载数据 → 调度通知）
  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      try {
        // 1. 从模板确保今天及未来7天的事件
        await Database.ensureFutureEvents(7);
      } catch (e) {
        console.warn('自动生成未来日程失败:', e);
      }

      // 2. 加载阶段列表
      try {
        const phaseList = await Database.getAllPhases();
        setPhases(phaseList);
      } catch (err) {
        console.warn('加载阶段列表失败:', err);
      }

      // 3. 调度所有未来通知（模板生成后执行）
      try {
        const today = getToday();
        const allEvents = await Database.getEventsByDateRange(today, '2099-12-31');
        if (allEvents.length > 0) {
          const settingsRaw = await Database.getAllSettings();
          await NotificationScheduler.scheduleEventNotifications(allEvents, {
            advanceMinutes: Number(settingsRaw.advanceMinutes) || 0,
          });
        }
      } catch (e) {
        console.warn('自动调度通知失败:', e);
      }
    })();
  }, [dbReady]);

  // 加载当天事件
  useEffect(() => {
    if (!dbReady) return;
    loadEvents(currentDate, selectedPhase);
  }, [dbReady, currentDate, selectedPhase]);

  const loadEvents = useCallback(async (date, phase) => {
    setLoading(true);
    setError(null);
    try {
      let eventList = await Database.getEventsByDate(date);

      // 如果当天没有事件，尝试从模板自动生成
      if (eventList.length === 0) {
        const generated = await Database.generateEventsFromTemplates(date);
        if (generated.length > 0) {
          eventList = generated;
          // 重新加载阶段列表
          const phaseList = await Database.getAllPhases();
          setPhases(phaseList);
        }
      }

      if (phase) {
        eventList = eventList.filter((e) => e.phase === phase);
      }
      setEvents(eventList);
    } catch (err) {
      setError('加载日程失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换日期
  const changeDate = useCallback((date) => {
    setCurrentDate(date);
  }, []);

  // 切换阶段筛选
  const changePhase = useCallback((phase) => {
    setSelectedPhase(phase);
  }, []);

  // 标记任务完成
  const completeEvent = useCallback(async (eventId) => {
    try {
      await Database.completeEvent(eventId);
      await Database.addLog(eventId, 'completed', '用户标记任务完成');
      // 刷新当前视图
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, completed: 1, completed_at: new Date().toISOString() }
            : e
        )
      );
    } catch (err) {
      setError('操作失败: ' + err.message);
    }
  }, []);

  // 跳过任务
  const skipEvent = useCallback(async (eventId) => {
    try {
      await Database.skipEvent(eventId);
      await Database.addLog(eventId, 'skipped', '用户跳过任务');
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, completed: 0, completed_at: null } : e
        )
      );
    } catch (err) {
      setError('操作失败: ' + err.message);
    }
  }, []);

  // 重置任务
  const resetEvent = useCallback(async (eventId) => {
    try {
      await Database.resetEvent(eventId);
      await Database.addLog(eventId, 'reset', '用户重置任务状态');
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, completed: 0, completed_at: null } : e
        )
      );
    } catch (err) {
      setError('操作失败: ' + err.message);
    }
  }, []);

  // 导入事件
  const importEvents = useCallback(async (newEvents) => {
    try {
      await Database.importEvents(newEvents);
      // 重新加载阶段列表和事件
      const phaseList = await Database.getAllPhases();
      setPhases(phaseList);
      setSelectedPhase(null);
      await loadEvents(currentDate, null);
    } catch (err) {
      setError('导入失败: ' + err.message);
      throw err;
    }
  }, [currentDate, loadEvents]);

  // 获取统计数据
  const getStats = useCallback(async (startDate, endDate) => {
    try {
      return await Database.getCompletionStats(startDate, endDate);
    } catch (err) {
      console.warn('获取统计数据失败:', err);
      return { total: 0, completed: 0, pending: 0 };
    }
  }, []);

  // 获取每日统计
  const getDailyStats = useCallback(async (startDate, endDate) => {
    try {
      return await Database.getDailyStats(startDate, endDate);
    } catch (err) {
      console.warn('获取每日统计失败:', err);
      return [];
    }
  }, []);

  const value = {
    // 状态
    events,
    currentDate,
    phases,
    selectedPhase,
    loading,
    error,
    dbReady,

    // 操作
    changeDate,
    changePhase,
    completeEvent,
    skipEvent,
    resetEvent,
    importEvents,
    loadEvents,
    getStats,
    getDailyStats,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule 必须在 ScheduleProvider 内使用');
  }
  return context;
}

export default ScheduleContext;
