/**
 * i18n 国际化入口
 * 支持中文(zh)和英文(en)切换，语言选择持久化到 AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import zh from './zh';
import en from './en';

const LANG_KEY = '@app_language';

// 当前语言（默认中文，启动时从存储加载）
let currentLocale = 'zh';

const translations = {
  zh,
  en,
};

/**
 * 从存储加载语言设置
 */
export async function initLocale() {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved && saved in translations) {
      currentLocale = saved;
    }
  } catch (e) {
    // 加载失败使用默认 zh
  }
  return currentLocale;
}

/**
 * 获取翻译文本
 * @param {string} key - 点号分隔的键，如 'home.title'
 * @param {object} [params] - 替换参数，如 { count: 5 }
 * @returns {string}
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

/**
 * 设置当前语言（持久化到 AsyncStorage）
 * @param {string} locale
 */
export async function setLocale(locale) {
  if (locale in translations) {
    currentLocale = locale;
    try {
      await AsyncStorage.setItem(LANG_KEY, locale);
    } catch (e) {
      // 持久化失败不影响切换
    }
  }
}

/**
 * 获取当前语言
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

export default { t, setLocale, getLocale, initLocale };
