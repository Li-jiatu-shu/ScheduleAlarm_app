/**
 * 提醒执行模块 — 闹铃 + TTS
 *
 * 提供语音播报、闹铃播放、振动等提醒功能。
 * speakEvent 支持 onDone 回调，用于语音结束后执行后续操作。
 * playAlarm 使用 expo-audio 播放闹钟铃声（支持熄屏播放）。
 */
import * as Speech from 'expo-speech';
import { Platform, Vibration } from 'react-native';
import { truncateText } from '../../utils/helpers';

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
  try { return await Speech.isSpeakingAsync(); } catch (e) { return false; }
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
 * @param {Object} options
 * @param {number} [options.volume=0.8] - 音量
 * @returns {{ stop: Function }} 返回 stop 方法用于停止
 */
export async function playAlarm(options = {}) {
  const { volume = 0.8 } = options;
  _alarmStopped = false;

  // 振动提醒（持续循环直至停止）
  const startVibration = () => {
    const PATTERN = [0, 400, 300, 400, 300, 400];
    Vibration.vibrate(PATTERN);
    // 使用重复振动模式替代 setInterval（Android 支持 repeat）
    if (Platform.OS === 'android') {
      // Android 振动会持续到被取消
      _vibrateInterval = setInterval(() => {
        if (!_alarmStopped) Vibration.vibrate(PATTERN);
      }, 2200);
    } else {
      _vibrateInterval = setInterval(() => {
        if (!_alarmStopped) Vibration.vibrate(PATTERN);
      }, 2200);
    }
  };

  startVibration();

  // 使用 expo-audio 播放闹钟铃声
  try {
    const { AudioPlayer } = require('expo-audio');
    const player = new AudioPlayer();
    player.volume = volume;
    player.loop = true;
    _alarmPlayer = player;

    // 尝试播放内置闹钟音频文件
    try {
      // 使用 require 加载本地音频资源
      const alarmAsset = require('../../../assets/alarm-sound.wav');
      await player.play(alarmAsset);
    } catch (assetErr) {
      console.warn('无法加载内置闹钟音频，尝试系统路径:', assetErr.message);
      // 回退：尝试通过 URI 播放
      try {
        await player.play({ uri: 'asset:///alarm-sound.wav' });
      } catch (uriErr) {
        console.warn('闹钟音频播放失败，仅使用振动+语音:', uriErr.message);
        // 无铃声时振动+语音依然有效
      }
    }

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
      player,
    };
  } catch (e) {
    console.warn('AudioPlayer 不可用，使用振动+系统通知代替:', e.message);
    return {
      stop: () => {
        _alarmStopped = true;
        if (_vibrateInterval) {
          clearInterval(_vibrateInterval);
          _vibrateInterval = null;
        }
        Vibration.cancel();
      },
    };
  }
}

export default { playAlarm, speakEvent, stopSpeech, isSpeaking, testSpeech };
