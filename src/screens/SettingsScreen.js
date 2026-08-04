/**
 * 设置页面
 *
 * 包含提醒设置、声音设置、显示设置、
 * 数据管理和关于信息。
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../context/SettingsContext';
import { testSpeech, playAlarm } from '../modules/notifier/Notifier';
import * as Database from '../modules/storage/Database';
import ConfirmDialog from '../components/ConfirmDialog';
import PrivacyModal from '../components/PrivacyModal';
import { t, setLocale, getLocale } from '../i18n';
import { formatDate, getToday } from '../utils/helpers';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // TTS 测试
  const handleTestSpeech = useCallback(() => {
    testSpeech({ rate: settings.ttsRate || 1.0 });
  }, [settings.ttsRate]);

  // 导出数据
  const handleExportData = useCallback(async () => {
    try {
      const allEvents = await Database.getEventsByDateRange('2000-01-01', '2099-12-31');
      if (allEvents.length === 0) {
        Alert.alert('提示', '暂无日程数据可导出');
        return;
      }

      // 生成可读文本格式
      const statusMap = { 0: '待完成', 1: '已完成' };
      const header = '日期 | 阶段 | 开始时间 | 结束时间 | 任务 | 内容 | 状态';
      const separator = '--- | --- | --- | --- | --- | --- | ---';
      const lines = [header, separator];

      for (const e of allEvents) {
        const status = statusMap[e.completed] || '待完成';
        lines.push(
          `${e.date} | ${e.phase || '-'} | ${e.start_time || '-'} | ${e.end_time || '-'} | ${e.title} | ${e.content || '-'} | ${status}`
        );
      }

      const content = lines.join('\n');
      const nowStr = formatDate(new Date());

      // 使用 Share API 导出（兼容 iOS/Android）
      if (Platform.OS === 'web') {
        Alert.alert('导出数据', content);
      } else {
        await Share.share({
          message: content,
          title: `小舒日程导出_${nowStr}`,
        });
      }
    } catch (err) {
      Alert.alert('导出失败', err.message);
    }
  }, []);

  // 加载日程方案
  const handleLoadScheduleSet = useCallback(async () => {
    try {
      const sets = await Database.getScheduleSets();
      const names = Object.keys(sets);
      if (names.length === 0) {
        Alert.alert('提示', '暂无已保存的日程方案');
        return;
      }
      // 显示方案列表供选择
      Alert.alert('选择方案', '点击方案名称以加载', [
        ...names.map((name) => ({
          text: name,
          onPress: async () => {
            try {
              await Database.loadScheduleSet(name);
              Alert.alert('成功', `已切换到方案"${name}"`);
            } catch (e) {
              Alert.alert('失败', e.message);
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('失败', e.message);
    }
  }, []);

  // 管理日程方案
  const handleManageScheduleSets = useCallback(async () => {
    try {
      const sets = await Database.getScheduleSets();
      const names = Object.keys(sets);
      if (names.length === 0) {
        Alert.alert('提示', '暂无已保存的日程方案');
        return;
      }
      Alert.alert('管理方案', '长按可删除方案', [
        ...names.map((name) => ({
          text: `删除 ${name}`,
          style: 'destructive',
          onPress: () => {
            Alert.alert('确认', `确定要删除方案"${name}"吗？`, [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await Database.deleteScheduleSet(name);
                    Alert.alert('成功', `方案"${name}"已删除`);
                  } catch (e) {
                    Alert.alert('失败', e.message);
                  }
                },
              },
            ]);
          },
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('失败', e.message);
    }
  }, []);

  // 上传自定义铃声
  const handlePickRingtone = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        updateSetting('customRingtoneUri', file.uri);
        Alert.alert('成功', `已选择自定义铃声: ${file.name}`);
      }
    } catch (err) {
      Alert.alert('选择失败', err.message);
    }
  }, [updateSetting]);

  // 清除自定义铃声
  const handleClearCustomRingtone = useCallback(() => {
    updateSetting('customRingtoneUri', null);
    Alert.alert('已清除', '已恢复使用内置强力铃声');
  }, [updateSetting]);

  // 切换强力铃声时段
  const handleToggleStrongSlot = useCallback((index) => {
    const slots = [...(settings.strongRingtoneSlots || [])];
    if (slots[index]) {
      slots.splice(index, 1);
    }
    updateSetting('strongRingtoneSlots', slots);
  }, [settings.strongRingtoneSlots, updateSetting]);

  // 添加强力铃声时段
  const handleAddStrongSlot = useCallback(() => {
    const slots = [...(settings.strongRingtoneSlots || [])];
    // 预设选项
    const presets = [
      { start: '06:00', end: '08:00', label: '早晨 6:00-8:00' },
      { start: '12:00', end: '14:00', label: '午间 12:00-14:00' },
      { start: '21:00', end: '23:00', label: '晚间 21:00-23:00' },
    ];
    const existing = new Set(slots.map((s) => `${s.start}-${s.end}`));
    const available = presets.filter((p) => !existing.has(`${p.start}-${p.end}`));

    if (available.length === 0) {
      Alert.alert('提示', '常用时段已全部添加');
      return;
    }

    Alert.alert('添加强力铃声时段', '选择常用时段', [
      ...available.map((p) => ({
        text: p.label,
        onPress: () => {
          const newSlots = [...slots, { start: p.start, end: p.end }];
          updateSetting('strongRingtoneSlots', newSlots);
        },
      })),
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [settings.strongRingtoneSlots, updateSetting]);

  // 清除数据
  const handleClearData = useCallback(async () => {
    try {
      await Database.clearAllData();
      Alert.alert(t('common.success'), t('settings.dataCleared'));
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    }
    setShowClearConfirm(false);
  }, []);

  // 主题切换
  const themeModes = ['auto', 'light', 'dark'];
  const themeModeLabels = {
    auto: t('settings.themeAuto'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  };
  const currentThemeIndex = themeModes.indexOf(settings.themeMode || 'auto');

  const handleThemeChange = () => {
    const nextIndex = (currentThemeIndex + 1) % 3;
    updateSetting('themeMode', themeModes[nextIndex]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('settings.title')}
        </Text>

        {/* --- 提醒设置 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.reminder')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* 提前提醒 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => {
              const options = [0, 5, 10, 15];
              const current = settings.advanceMinutes || 0;
              const next = options[(options.indexOf(current) + 1) % options.length];
              updateSetting('advanceMinutes', next);
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.advanceTime')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {settings.advanceMinutes > 0
                ? t('settings.advanceTimeDesc', { minutes: settings.advanceMinutes })
                : t('settings.onTime')}
            </Text>
          </TouchableOpacity>

          {/* 稍后提醒选项 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.snoozeOptions')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {settings.snoozeOptions?.join(' / ') || '5 / 10 / 15'} {t('settings.minutes')}
            </Text>
          </TouchableOpacity>

          {/* 静默时段 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.quietHours')}
            </Text>
            <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
              {t('settings.quietHoursDesc')}
            </Text>
          </View>
          <View style={[styles.row, styles.subRow]}>
            <Text style={[styles.rowLabel, { color: theme.textSecondary, fontSize: 13 }]}>
              {t('settings.quietStart')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                // 简单切换静默开始时间 (22:00 / 23:00 / 00:00)
                const options = ['22:00', '23:00', '00:00'];
                const current = settings.quietStartTime || '23:00';
                const next = options[(options.indexOf(current) + 1) % options.length];
                updateSetting('quietStartTime', next);
              }}
            >
              <Text style={[styles.rowValue, { color: theme.primary }]}>
                {settings.quietStartTime || '23:00'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, styles.subRow]}>
            <Text style={[styles.rowLabel, { color: theme.textSecondary, fontSize: 13 }]}>
              {t('settings.quietEnd')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const options = ['05:00', '06:00', '07:00'];
                const current = settings.quietEndTime || '06:00';
                const next = options[(options.indexOf(current) + 1) % options.length];
                updateSetting('quietEndTime', next);
              }}
            >
              <Text style={[styles.rowValue, { color: theme.primary }]}>
                {settings.quietEndTime || '06:00'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 声音设置 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.sound')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* 语音播报开关 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                {t('settings.ttsEnabled')}
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                {t('settings.ttsEnabledDesc')}
              </Text>
            </View>
            <Switch
              value={settings.ttsEnabled !== false}
              onValueChange={(val) => updateSetting('ttsEnabled', val)}
              trackColor={{ false: theme.surfaceSecondary, true: theme.primaryLight }}
              thumbColor={settings.ttsEnabled !== false ? theme.primary : theme.textTertiary}
            />
          </View>

          {/* 播报语速 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.ttsSpeed')}
            </Text>
            <View style={styles.speedControl}>
              <TouchableOpacity
                style={[styles.speedBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => {
                  const rate = Math.max(0.8, (settings.ttsRate || 1.0) - 0.1);
                  updateSetting('ttsRate', Math.round(rate * 10) / 10);
                }}
              >
                <Text style={[styles.speedBtnText, { color: theme.textPrimary }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.speedValue, { color: theme.primary }]}>
                {settings.ttsRate || 1.0}x
              </Text>
              <TouchableOpacity
                style={[styles.speedBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => {
                  const rate = Math.min(1.5, (settings.ttsRate || 1.0) + 0.1);
                  updateSetting('ttsRate', Math.round(rate * 10) / 10);
                }}
              >
                <Text style={[styles.speedBtnText, { color: theme.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 测试语音 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={handleTestSpeech}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.ttsTest')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {t('settings.ttsTestButton')}
            </Text>
          </TouchableOpacity>

          {/* 闹铃音量 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.alarmVolume')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {Math.round((settings.alarmVolume || 0.8) * 100)}%
            </Text>
          </View>

          {/* 强制音量 */}
          <View style={[styles.row]}>
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                {t('settings.forceVolume')}
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                {t('settings.forceVolumeDesc')}
              </Text>
            </View>
            <Switch
              value={settings.forceVolumeInSilent === true}
              onValueChange={(val) => updateSetting('forceVolumeInSilent', val)}
              trackColor={{ false: theme.surfaceSecondary, true: theme.primaryLight }}
              thumbColor={settings.forceVolumeInSilent ? theme.primary : theme.textTertiary}
            />
          </View>
        </View>

        {/* --- 铃声选择 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          铃声管理
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* 自定义铃声上传 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={handlePickRingtone}
          >
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                自定义强力铃声
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                {settings.customRingtoneUri
                  ? '已上传自定义铃声（优先使用）'
                  : '未上传，将使用内置 clock-sound.wav'}
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {settings.customRingtoneUri ? '📁 已设置' : '📤 上传'}
            </Text>
          </TouchableOpacity>

          {/* 清除自定义铃声 */}
          {settings.customRingtoneUri ? (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: theme.border }]}
              onPress={handleClearCustomRingtone}
            >
              <Text style={[styles.rowLabel, { color: theme.danger }]}>
                恢复默认铃声
              </Text>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                使用内置 clock-sound.wav
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* 测试强力铃声 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => {
              const customUri = settings.customRingtoneUri;
              const vol = settings.wakeUpVolume || 0.9;
              playAlarm({
                volume: vol,
                soundType: customUri ? 'custom' : 'clock',
                customUri,
                loop: true,
              }).then((ctrl) => {
                setTimeout(() => ctrl.stop(), 6000);
              });
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              试听强力铃声
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>🔊</Text>
          </TouchableOpacity>

          {/* 测试日常提醒铃声 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const vol = settings.alarmVolume || 0.8;
              playAlarm({
                volume: vol,
                soundType: 'alarm',
                loop: true,
              }).then((ctrl) => {
                setTimeout(() => ctrl.stop(), 4000);
              });
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              试听日常提醒铃声
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* --- 强力铃声时段 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          强力铃声时段
        </Text>
        <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>
          在这些时段内，提醒将使用强力铃声（自定义或clock-sound.wav），其他时段使用日常提醒铃声（alarm-sound.wav）
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {(settings.strongRingtoneSlots || []).map((slot, idx) => (
            <TouchableOpacity
              key={`${slot.start}-${slot.end}`}
              style={[styles.row, { borderBottomColor: theme.border }]}
              onPress={() => handleToggleStrongSlot(idx)}
            >
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                ⏰ {slot.start} - {slot.end}
              </Text>
              <Text style={[styles.rowValue, { color: theme.danger }]}>
                移除
              </Text>
            </TouchableOpacity>
          ))}

          {/* 添加强力时段按钮 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={handleAddStrongSlot}
          >
            <Text style={[styles.rowLabel, { color: theme.primary }]}>
              + 添加强力铃声时段
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- 起床闹钟 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.wakeUp')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* 启用开关 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                {t('settings.wakeUpEnabled')}
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                {t('settings.wakeUpEnabledDesc')}
              </Text>
            </View>
            <Switch
              value={settings.wakeUpEnabled === true}
              onValueChange={(val) => updateSetting('wakeUpEnabled', val)}
              trackColor={{ false: theme.surfaceSecondary, true: theme.primaryLight }}
              thumbColor={settings.wakeUpEnabled ? theme.primary : theme.textTertiary}
            />
          </View>

          {/* 起床时间 */}
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => {
              const options = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30'];
              const current = settings.wakeUpTime || '07:00';
              const idx = options.indexOf(current);
              const next = options[(idx + 1) % options.length];
              updateSetting('wakeUpTime', next);
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.wakeUpTime')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {settings.wakeUpTime || '07:00'}
            </Text>
          </TouchableOpacity>

          {/* 起床铃声音量 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.wakeUpVolume')}
            </Text>
            <View style={styles.speedControl}>
              <TouchableOpacity
                style={[styles.speedBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => {
                  const vol = Math.max(0.5, (settings.wakeUpVolume || 0.9) - 0.1);
                  updateSetting('wakeUpVolume', Math.round(vol * 10) / 10);
                }}
              >
                <Text style={[styles.speedBtnText, { color: theme.textPrimary }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.speedValue, { color: theme.primary }]}>
                {Math.round((settings.wakeUpVolume || 0.9) * 100)}%
              </Text>
              <TouchableOpacity
                style={[styles.speedBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => {
                  const vol = Math.min(1.0, (settings.wakeUpVolume || 0.9) + 0.1);
                  updateSetting('wakeUpVolume', Math.round(vol * 10) / 10);
                }}
              >
                <Text style={[styles.speedBtnText, { color: theme.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 测试起床铃声 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const customUri = settings.customRingtoneUri;
              const vol = settings.wakeUpVolume || 0.9;
              playAlarm({
                volume: vol,
                soundType: customUri ? 'custom' : 'clock',
                customUri,
                loop: true,
              }).then((ctrl) => {
                setTimeout(() => ctrl.stop(), 8000);
              });
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              测试起床铃声
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>⏰</Text>
          </TouchableOpacity>
        </View>

        {/* --- 午休闹钟 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          午休闹钟
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* 启用开关 */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                启用午休闹钟
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                每天定时提醒午休（使用强力铃声）
              </Text>
            </View>
            <Switch
              value={settings.napAlarmEnabled === true}
              onValueChange={(val) => updateSetting('napAlarmEnabled', val)}
              trackColor={{ false: theme.surfaceSecondary, true: theme.primaryLight }}
              thumbColor={settings.napAlarmEnabled ? theme.primary : theme.textTertiary}
            />
          </View>

          {/* 午休时间 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const options = ['12:00', '12:30', '13:00', '13:30', '14:00'];
              const current = settings.napAlarmTime || '13:00';
              const idx = options.indexOf(current);
              const next = options[(idx + 1) % options.length];
              updateSetting('napAlarmTime', next);
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              午休时间
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {settings.napAlarmTime || '13:00'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- 显示设置 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.display')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={handleThemeChange}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.theme')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {themeModeLabels[themeModes[currentThemeIndex]]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const current = getLocale();
              const next = current === 'zh' ? 'en' : 'zh';
              setLocale(next);
              // Force re-render
              updateSetting('language', next);
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              语言 / Language
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {getLocale() === 'zh' ? '中文' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- 数据管理 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.dataManagement')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={handleExportData}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.exportData')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {t('settings.exportDataDesc')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row]}
            onPress={() => setShowClearConfirm(true)}
          >
            <Text style={[styles.rowLabel, { color: theme.danger }]}>
              {t('settings.clearData')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- 日程方案 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          日程方案
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => {
              Alert.prompt
                ? Alert.prompt('保存当前方案', '请输入方案名称（如"备考方案"）', [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.save'),
                      onPress: async (name) => {
                        if (name && name.trim()) {
                          try {
                            await Database.saveCurrentAsScheduleSet(name.trim());
                            Alert.alert('成功', `方案"${name.trim()}"已保存`);
                          } catch (e) {
                            Alert.alert('失败', e.message);
                          }
                        }
                      },
                    },
                  ])
                : (() => {
                    // Android: use simple Alert with no prompt
                    Alert.alert('保存当前方案', '请输入方案名称', [
                      { text: t('common.cancel'), style: 'cancel' },
                    ]);
                  })();
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>保存当前方案</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>将当前日程保存为方案以便切换</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={handleLoadScheduleSet}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>切换方案</Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>选择</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row]}
            onPress={handleManageScheduleSets}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>管理方案</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>查看/删除已保存的方案</Text>
          </TouchableOpacity>
        </View>

        {/* --- 关于 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.about')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>版本</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>1.3.0</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => setShowPrivacy(true)}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>隐私政策</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => Alert.alert('意见反馈', '请发送邮件至：support@xiaoshuapp.com')}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>意见反馈</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* --- 账户 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>账户</Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => setShowDeleteAccount(true)}
          >
            <Text style={[styles.rowLabel, { color: theme.danger }]}>注销账户</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>清除所有数据并重置</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 清除数据确认 */}
      <ConfirmDialog
        visible={showClearConfirm}
        title={t('settings.clearData')}
        message={t('settings.clearDataConfirm')}
        confirmLabel={t('common.delete')}
        confirmDestructive
        onConfirm={handleClearData}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* 注销账户确认 */}
      <ConfirmDialog
        visible={showDeleteAccount}
        title="注销账户"
        message="注销将清除您的所有日程数据、设置和操作日志。此操作不可撤销，确定要继续吗？"
        confirmLabel="确认注销"
        confirmDestructive
        onConfirm={handleClearData}
        onCancel={() => setShowDeleteAccount(false)}
      />

      {/* 隐私政策弹窗 */}
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subRow: {
    paddingLeft: 32,
    paddingVertical: 10,
  },
  rowTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 14,
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedBtnText: {
    fontSize: 18,
    fontWeight: '400',
  },
  speedValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
});
