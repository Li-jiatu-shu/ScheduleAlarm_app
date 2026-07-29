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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../context/SettingsContext';
import { testSpeech } from '../modules/notifier/Notifier';
import * as Database from '../modules/storage/Database';
import ConfirmDialog from '../components/ConfirmDialog';
import PrivacyModal from '../components/PrivacyModal';
import { t } from '../i18n';

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

        {/* --- 显示设置 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.display')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row]}
            onPress={handleThemeChange}
          >
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('settings.theme')}
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {themeModeLabels[themeModes[currentThemeIndex]]}
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
            onPress={() => Alert.alert(t('common.info'), t('common.comingSoon'))}
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

        {/* --- 关于 --- */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t('settings.about')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>版本</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>1.2.0</Text>
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
