/**
 * 用户设置全局状态管理
 *
 * 管理提醒、声音、显示等所有用户偏好设置，
 * 通过此 Context 提供统一的设置读写接口。
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Database from '../modules/storage/Database';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { safeJsonParse } from '../utils/helpers';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // 从数据库加载设置
  useEffect(() => {
    async function load() {
      try {
        await Database.initDatabase();
        setDbReady(true);
        const stored = await Database.getAllSettings();
        // 合并默认值和存储值
        const merged = { ...DEFAULT_SETTINGS };
        for (const [key, value] of Object.entries(stored)) {
          if (key in DEFAULT_SETTINGS) {
            // 尝试解析 JSON
            const parsed = safeJsonParse(value, value);
            // 对于数字类型的设置，确保类型正确
            if (typeof DEFAULT_SETTINGS[key] === 'number') {
              merged[key] = Number(parsed);
            } else if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
              merged[key] = parsed === true || parsed === 'true' || parsed === '1';
            } else if (Array.isArray(DEFAULT_SETTINGS[key])) {
              merged[key] = Array.isArray(parsed) ? parsed : DEFAULT_SETTINGS[key];
            } else {
              merged[key] = parsed;
            }
          }
        }
        setSettings(merged);
      } catch (err) {
        console.warn('加载设置失败，使用默认值:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 更新单个设置项
  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (dbReady) {
      try {
        await Database.setSetting(key, value);
      } catch (err) {
        console.warn('保存设置失败:', err);
      }
    }
  }, [dbReady]);

  // 批量更新设置
  const updateSettings = useCallback(async (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    if (dbReady) {
      try {
        for (const [key, value] of Object.entries(updates)) {
          await Database.setSetting(key, value);
        }
      } catch (err) {
        console.warn('批量保存设置失败:', err);
      }
    }
  }, [dbReady]);

  // 获取指定设置项
  const getSetting = useCallback((key) => {
    return settings[key] ?? DEFAULT_SETTINGS[key];
  }, [settings]);

  // 重置所有设置为默认值
  const resetSettings = useCallback(async () => {
    setSettings({ ...DEFAULT_SETTINGS });
    if (dbReady) {
      try {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await Database.setSetting(key, value);
        }
      } catch (err) {
        console.warn('重置设置失败:', err);
      }
    }
  }, [dbReady]);

  const value = {
    settings,
    loading,
    dbReady,
    updateSetting,
    updateSettings,
    getSetting,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings 必须在 SettingsProvider 内使用');
  }
  return context;
}

export default SettingsContext;
