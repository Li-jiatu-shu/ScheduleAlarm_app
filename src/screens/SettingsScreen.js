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
import { testSpeech } from '../modules/notifier/Notifier';
import * as Database from '../modules/storage/Database';
import ConfirmDialog from '../components/ConfirmDialog';
import PrivacyModal from '../components/PrivacyModal';
import { t, setLocale, getLocale } from '../i18n';
import { formatDate, getToday } from '../utils/helpers';

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
          日程提醒铃声
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => {
              const current = settings.reminderSoundType || 'alarm';
              const next = current === 'alarm' ? 'clock' : 'alarm';
              updateSetting('reminderSoundType', next);
            }}
          >
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                {t('settings.ringtone')}
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                {settings.reminderSoundType === 'clock'
                  ? t('settings.ringtoneClockDesc')
                  : t('settings.ringtoneAlarmDesc')}
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {settings.reminderSoundType === 'clock'
                ? t('settings.ringtoneClock')
                : t('settings.ringtoneAlarm')}
            </Text>
          </TouchableOpacity>

          {/* 测试闹铃 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const Notifier = require('../modules/notifier/Notifier');
              const type = settings.reminderSoundType || 'alarm';
              const vol = settings.alarmVolume || 0.8;
              Notifier.playAlarm({
                volume: vol,
                soundType: type,
                loop: type === 'clock',
              }).then((ctrl) => {
                // 3秒后自动停止测试（长音频播5秒）
                setTimeout(() => ctrl.stop(), type === 'clock' ? 5000 : 3000);
              });
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.ttsTestButton')} 提醒铃声
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>🔔</Text>
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
              const options = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30'];
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
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {Math.round((settings.wakeUpVolume || 0.9) * 100)}%
            </Text>
          </View>

          {/* 测试起床铃声 */}
          <TouchableOpacity
            style={[styles.row]}
            onPress={() => {
              const Notifier = require('../modules/notifier/Notifier');
              const vol = settings.wakeUpVolume || 0.9;
              Notifier.playAlarm({
                volume: vol,
                soundType: 'clock',
                loop: true,
              }).then((ctrl) => {
                // 起床铃声较长，播8秒
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
