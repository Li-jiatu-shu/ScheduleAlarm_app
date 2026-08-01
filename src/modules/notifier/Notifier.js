/**
 * 提醒执行模块 — 闹铃 + TTS
 *
 * 提供语音播报、闹铃播放、振动等提醒功能。
 * speakEvent 支持 onDone 回调，用于语音结束后执行后续操作。
 * playAlarm 使用 expo-audio 播放闹钟铃声（支持熄屏播放）。
 *
 * 支持的音频资源：
 * - alarm-sound.wav  — 短促闹铃，用于日程提醒弹窗
 * - clock-sound.wav  — 长音频铃声，用于起床闹钟
 */
import * as Speech from 'expo-speech';
import { Platform, Vibration } from 'react-native';
import { Asset } from 'expo-asset';
import { AudioPlayer } from 'expo-audio';
import { truncateText } from '../../utils/helpers';

// 音频资源模块引用（静态 require 确保 Metro 打包）
const ALARM_MODULE = require('../../../assets/alarm-sound.wav');
const CLOCK_MODULE = require('../../../assets/clock-sound.wav');

// 缓存已解析的音频 URI
let _alarmUri = null;
let _clockUri = null;

/**
 * 解析音频资源的本地 URI（解决 production build 中 require 返回结构不一致的问题）
 */
async function resolveAudioUri(moduleRef) {
  try {
    const asset = await Asset.fromModule(moduleRef);
    await asset.downloadAsync();
    return asset.localUri || asset.uri;
  } catch (e) {
    console.warn('音频资源解析失败:', e.message);
    // 回退：尝试直接从 module 中取 uri
    if (moduleRef && typeof moduleRef === 'object' && moduleRef.uri) {
      return moduleRef.uri;
    }
    return null;
  }
}

/**
 * 获取音频 URI（带缓存）
 */
async function getAudioUri(type) {
  if (type === 'clock') {
    if (!_clockUri) _clockUri = await resolveAudioUri(CLOCK_MODULE);
    return _clockUri;
  }
  if (!_alarmUri) _alarmUri = await resolveAudioUri(ALARM_MODULE);
  return _alarmUri;
}

// ---- TTS 语音播报 ----

/**
 * 播报任务事件
 * @param {Object} event - 任务事件
 * @param {Object} options
 * @param {number} [options.rate=1.0] - 语速
 * @param {Function} [options.onDone] - 语音播报完成后的回调
 * @param {Function} [options.onStart] - 语音开始播报的回调
 * @param {Function} [options.onError] - 语音播报出错回调
 */
export async function speakEvent(event, options = {}) {
  const { rate = 1.0, onDone, onStart, onError } = options;
  try {
    const now = new Date();
    const timeStr = `${now.getHours()}点${now.getMinutes()}分`;
    const title = event.title || event.data?.title || '';
    const content = event.content || event.data?.content || '';
    const text = `现在时间是 ${timeStr}，请执行任务：${title}。${
      content ? '具体内容为：' + truncateText(content, 50) : ''
    }`;
    await Speech.stop();
    await Speech.speak(text, {
      language: 'zh-CN',
      pitch: 1.0,
      rate,
      volume: 1.0,
      onStart: () => {
        if (onStart) onStart();
      },
      onDone: () => {
        if (onDone) onDone();
      },
      onError: (err) => {
        console.warn('TTS 播报出错:', err);
        // 出错时也触发 onDone，确保流程继续
        if (onDone) onDone();
        if (onError) onError(err);
      },
    });
  } catch (e) {
    console.warn('TTS 播报失败:', e);
    // 即使失败也调用 onDone 确保流程不卡住
    if (options.onDone) options.onDone();
  }
}

export async function stopSpeech() {
  try { await Speech.stop(); } catch (e) { /* ignore */ }
}

export async function isSpeaking() {
  try { return await Speech.isSpeakingAsync(); } catch (e) {
    console.warn('isSpeaking 检查失败:', e);
    return false;
  }
}

export async function testSpeech(options = {}) {
  const { rate = 1.0, onDone } = options;
  try {
    await Speech.stop();
    await Speech.speak('这是一段测试语音，小舒日程闹钟提醒您按时完成计划。', {
      language: 'zh-CN',
      pitch: 1.0,
      rate,
      volume: 1.0,
      onDone: () => {
        if (onDone) onDone();
      },
    });
  } catch (e) {
    console.warn('测试语音失败:', e);
    if (onDone) onDone();
  }
}

// ---- 闹铃播放 ----

let _alarmPlayer = null;
let _vibrateInterval = null;
let _alarmStopped = false;

/**
 * 播放闹钟铃声（同时振动）
 * 使用 expo-audio 播放循环铃声，支持熄屏时继续播放。
 *
 * @param {Object} options
 * @param {number} [options.volume=0.8] - 音量 (0.0-1.0)
 * @param {'alarm'|'clock'} [options.soundType='alarm'] - 音频类型
 *   - 'alarm': 短促闹铃(alarm-sound.wav)，用于日程提醒弹窗
 *   - 'clock': 长音频铃声(clock-sound.wav)，用于起床闹钟
 * @param {boolean} [options.loop=true] - 是否循环播放（起床闹钟建议 true）
 * @returns {{ stop: Function }} 返回 stop 方法用于停止
 */
export async function playAlarm(options = {}) {
  const { volume = 0.8, soundType = 'alarm', loop = true } = options;

  // 清理之前可能残留的闹铃状态（防止孤儿定时器）
  _alarmStopped = true;
  if (_alarmPlayer) {
    try { _alarmPlayer.stop(); } catch (e) { /* ignore */ }
    _alarmPlayer = null;
  }
  if (_vibrateInterval) {
    clearInterval(_vibrateInterval);
    _vibrateInterval = null;
  }
  Vibration.cancel();

  _alarmStopped = false;

  // 振动提醒（持续循环直至停止）
  const startVibration = () => {
    const PATTERN = [0, 400, 300, 400, 300, 400];
    Vibration.vibrate(PATTERN);
    _vibrateInterval = setInterval(() => {
      if (!_alarmStopped) Vibration.vibrate(PATTERN);
    }, 2200);
  };

  startVibration();

  // 使用 expo-audio 播放闹钟铃声
  try {
    // 先解析音频 URI（带 Asset 模块解析，确保 production build 中正确获取文件路径）
    const audioUri = await getAudioUri(soundType);
    if (!audioUri) {
      console.warn('音频 URI 解析失败，使用振动代替');
      return makeStopHandle();
    }

    const player = new AudioPlayer();
    player.volume = volume;
    player.loop = loop;
    _alarmPlayer = player;

    try {
      await player.play({ uri: audioUri });
    } catch (playErr) {
      console.warn(`播放${soundType}音频失败:`, playErr.message);
      // 回退：如果 clock 播放失败，尝试 alarm
      if (soundType === 'clock') {
        const fallbackUri = await getAudioUri('alarm');
        if (fallbackUri) {
          try {
            await player.play({ uri: fallbackUri });
            return makeStopHandle(player);
          } catch (fbErr) {
            console.warn('回退音频也播放失败:', fbErr.message);
          }
        }
      }
      // 清理播放器
      try { player.stop(); } catch (e) { /* ignore */ }
      _alarmPlayer = null;
      return makeStopHandle();
    }

    return makeStopHandle(player);
  } catch (e) {
    console.warn('AudioPlayer 创建失败:', e.message);
    return makeStopHandle();
  }
}

/**
 * 创建 stop 句柄
 */
function makeStopHandle(player) {
  return {
    stop: () => {
      _alarmStopped = true;
      try {
        if (_alarmPlayer) { _alarmPlayer.stop(); _alarmPlayer = null; }
      } catch (e) { /* ignore */ }
      if (_vibrateInterval) {
        clearInterval(_vibrateInterval);
        _vibrateInterval = null;
      }
      Vibration.cancel();
    },
    player: player || null,
  };
}

export default { playAlarm, speakEvent, stopSpeech, isSpeaking, testSpeech };
