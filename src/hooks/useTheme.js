/**
 * useTheme Hook
 * 获取当前主题的配色方案（跟随系统浅色/深色模式）
 */

import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme } from '../utils/theme';
import { useSettings } from '../context/SettingsContext';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const { getSetting } = useSettings();

  const themeMode = getSetting('themeMode') || 'auto';

  let isDark;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    isDark = systemColorScheme === 'dark';
  }

  return isDark ? DarkTheme : LightTheme;
}

export default useTheme;
