/**
 * 编辑任务页面
 *
 * 修改单个任务的各项属性，
 * 保存后更新数据库和通知调度。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Database from '../modules/storage/Database';
import * as NotificationScheduler from '../modules/scheduler/NotificationScheduler';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import { getToday, addDays, formatDate } from '../utils/helpers';

// 预设阶段选项
const PHASE_OPTIONS = ['基础阶段', '强化阶段', '冲刺阶段', '未分类'];

export default function EditTaskScreen({ route, navigation }) {
  const theme = useTheme();
  const { eventId } = route.params || {};

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 表单状态
  const [phase, setPhase] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);

  // 加载事件数据
  useEffect(() => {
    async function load() {
      try {
        const data = await Database.getEventById(eventId);
        if (data) {
          setEvent(data);
          setPhase(data.phase || '');
          setDate(data.date || '');
          setStartTime(data.start_time || '');
          setEndTime(data.end_time || '');
          setTitle(data.title || '');
          setContent(data.content || '');
          setEnabled(data.enabled === 1);
        }
      } catch (err) {
        Alert.alert(t('common.error'), '加载任务失败');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  // 保存
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.warning'), t('edit.fieldRequired'));
      return;
    }

    setSaving(true);
    try {
      await Database.updateEvent(eventId, {
        phase,
        date,
        start_time: startTime,
        end_time: endTime || null,
        title: title.trim(),
        content: content.trim(),
        enabled: enabled ? 1 : 0,
      });

      // 更新此任务的通知调度
      try {
        await NotificationScheduler.cancelEventNotification(eventId);
        await NotificationScheduler.scheduleEventNotifications([{
          id: eventId, phase, date, start_time: startTime, end_time: endTime,
          title: title.trim(), content: content.trim(), enabled: enabled ? 1 : 0,
        }], { advanceMinutes: 0 });
      } catch (e) { /* 通知调度失败不影响保存 */ }

      Alert.alert(t('common.success'), t('edit.saveSuccess'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t('edit.saveFailed'), err.message);
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    try {
      await Database.deleteEvent(eventId);
      await Database.addLog(eventId, 'deleted', '用户手动删除任务');
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), '删除失败: ' + err.message);
    }
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: theme.textSecondary }}>任务不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* 标题栏 */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('edit.title')}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.headerBtn, { color: theme.primary, fontWeight: '600' }]}>
            {saving ? '...' : t('edit.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 阶段 — 快速选择芯片 */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('edit.phase')}
          </Text>
          <View style={styles.phaseChipRow}>
            {PHASE_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.phaseChip,
                  {
                    backgroundColor: phase === p ? theme.primary + '20' : theme.surface,
                    borderColor: phase === p ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setPhase(p)}
              >
                <Text style={[
                  styles.phaseChipText,
                  { color: phase === p ? theme.primary : theme.textSecondary },
                ]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 日期 — 带快速切换按钮 */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('edit.date')}
          </Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateQuickBtn, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => setDate(formatDate(addDays(new Date(getToday()), -1)))}
            >
              <Text style={[styles.dateQuickBtnText, { color: theme.textSecondary }]}>昨天</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateQuickBtn, { backgroundColor: theme.primary + '20' }]}
              onPress={() => setDate(getToday())}
            >
              <Text style={[styles.dateQuickBtnText, { color: theme.primary }]}>今天</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateQuickBtn, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => setDate(formatDate(addDays(new Date(getToday()), 1)))}
            >
              <Text style={[styles.dateQuickBtnText, { color: theme.textSecondary }]}>明天</Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.dateInput,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        </View>

        {/* 开始时间和结束时间 */}
        <View style={styles.timeRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('edit.startTime')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:mm"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('edit.endTime')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:mm（可选）"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        </View>

        {/* 任务标题 */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('edit.taskTitle')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="任务标题"
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        {/* 具体内容 */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('edit.content')}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.surface,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={content}
            onChangeText={setContent}
            placeholder="具体内容和要求..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* 启用状态 */}
        <View style={[styles.switchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            {t('edit.enabled')}
          </Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: theme.surfaceSecondary, true: theme.primaryLight }}
            thumbColor={enabled ? theme.primary : theme.textTertiary}
          />
        </View>

        {/* 删除按钮 */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: theme.danger }]}
          onPress={() => setShowDeleteConfirm(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteText, { color: theme.danger }]}>
            {t('edit.delete')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 删除确认 */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title={t('edit.delete')}
        message={t('edit.deleteConfirm')}
        confirmLabel={t('common.delete')}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // 阶段芯片
  phaseChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  phaseChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 日期快捷
  dateRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dateQuickBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateQuickBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minWidth: 90,
  },
});
