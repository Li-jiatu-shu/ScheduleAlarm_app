/**
 * i18n 国际化入口
 * 预留多语言支持结构
 */
import zh from './zh';

// 当前语言，后续可通过设置切换
let currentLocale = 'zh';

const translations = {
  zh,
  // en: {}, // 预留英文翻译
};

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
      // 回退到 key 本身
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // 替换参数占位符 {key}
  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

/**
 * 设置当前语言
 * @param {string} locale
 */
export function setLocale(locale) {
  if (locale in translations) {
    currentLocale = locale;
  }
}

/**
 * 获取当前语言
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

export default { t, setLocale, getLocale };
