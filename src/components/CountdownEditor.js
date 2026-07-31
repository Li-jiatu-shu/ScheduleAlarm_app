/**
 * CountdownEditor — 倒计时编辑弹窗
 *
 * 支持新增/编辑倒计时：日期选择、名称、类型、颜色、图标、提醒天数。
 * 使用 ScrollView + 手动输入日期（兼容性好，无需第三方日期选择器）。
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';
import { formatDate } from '../utils/helpers';

const COUNTDOWN_TYPES = [
  { key: 'exam', emoji: '📝', label: '考试' },
  { key: 'registration', emoji: '📋', label: '报名' },
  { key: 'deadline', emoji: '⏰', label: '截止' },
  { key: 'meeting', emoji: '🤝', label: '会议' },
  { key: 'travel', emoji: '✈️', label: '出行' },
  { key: 'birthday', emoji: '🎂', label: '生日' },
  { key: 'holiday', emoji: '🎉', label: '节日' },
  { key: 'other', emoji: '📌', label: '其他' },
];

const PRESET_COLORS = [
  '#FF7B9C', '#FF8A80', '#FF9AA2', '#FFD93D',
  '#FFA726', '#66BB6A', '#26C6DA', '#42A5F5',
  '#7E57C2', '#AB47BC', '#8D6E63', '#78909C',
];

const NOTIFY_OPTIONS = [
  { value: 1, label: '1天前' },
  { value: 3, label: '3天前' },
  { value: 7, label: '7天前' },
  { value: 14, label: '14天前' },
  { value: 30, label: '30天前' },
];

/**
 * 简单日期验证 YYYY-MM-DD
 */
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

export default function CountdownEditor({ visible, countdown, onSave, onCancel }) {
  const theme = useTheme();
  const isEdit = !!countdown;

  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [type, setType] = useState('other');
  const [color, setColor] = useState('#FF7B9C');
  const [emoji, setEmoji] = useState('📅');
  const [notifyDays, setNotifyDays] = useState([]);

  // 初始化表单
  useEffect(() => {
    if (visible) {
      if (countdown) {
        setTitle(countdown.title || '');
        setTargetDate(countdown.targetDate || '');
        setType(countdown.type || 'other');
        setColor(countdown.color || '#FF7B9C');
        setEmoji(countdown.emoji || '📅');
        setNotifyDays(countdown.notifyDays || []);
      } else {
        // 默认日期：7天后
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setTitle('');
        setTargetDate(formatDate(defaultDate));
        setType('other');
        setColor('#FF7B9C');
        setEmoji('📅');
        setNotifyDays([1, 3, 7]);
      }
    }
  }, [visible, countdown]);

  const toggleNotifyDay = (day) => {
    setNotifyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('提示', '请输入倒计时名称');
      return;
    }
    if (!isValidDate(targetDate)) {
      Alert.alert('提示', '请输入正确的日期格式（如 2026-08-15）');
      return;
    }
    // 获取类型对应的默认 emoji
    const typeInfo = COUNTDOWN_TYPES.find((t) => t.key === type);
    const defaultEmoji = typeInfo ? typeInfo.emoji : '📅';

    onSave({
      ...(countdown || {}),
      title: trimmedTitle,
      targetDate,
      type,
      color,
      emoji: emoji || defaultEmoji,
      notifyDays,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.modalBackground }]}>
          {/* 顶部栏 */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.cancelBtn, { color: theme.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {isEdit ? t('countdown.edit') : t('countdown.add')}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.saveBtn, { color: theme.primary }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 名称 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.countdownTitle')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.surfaceSecondary,
                color: theme.textPrimary,
                borderColor: theme.border,
              }]}
              placeholder="例如：考研初试、项目截止日"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={30}
            />

            {/* 日期 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.targetDate')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.surfaceSecondary,
                color: theme.textPrimary,
                borderColor: theme.border,
              }]}
              placeholder="YYYY-MM-DD（如 2026-08-15）"
              placeholderTextColor={theme.textTertiary}
              value={targetDate}
              onChangeText={setTargetDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            {targetDate && isValidDate(targetDate) ? (
              <Text style={[styles.hint, { color: theme.success }]}>
                ✅ 有效日期
              </Text>
            ) : targetDate ? (
              <Text style={[styles.hint, { color: theme.danger }]}>
                ❌ 日期格式不正确
              </Text>
            ) : null}

            {/* 类型选择 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.type')}
            </Text>
            <View style={styles.chipRow}>
              {COUNTDOWN_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: type === item.key ? (color + '30') : theme.surfaceSecondary,
                      borderColor: type === item.key ? color : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setType(item.key);
                    setEmoji(item.emoji);
                  }}
                >
                  <Text style={styles.typeEmoji}>{item.emoji}</Text>
                  <Text style={[
                    styles.typeLabel,
                    { color: type === item.key ? color : theme.textSecondary },
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 颜色选择 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.color')}
            </Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {/* 图标预览 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.emoji')}
            </Text>
            <View style={styles.emojiRow}>
              {['📝', '📋', '⏰', '🤝', '✈️', '🎂', '🎉', '📌', '📅', '🎯', '💪', '⭐', '🔥', '🏆', '💼', '📚'].map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[
                    styles.emojiChip,
                    { backgroundColor: emoji === em ? (color + '30') : theme.surfaceSecondary },
                  ]}
                  onPress={() => setEmoji(em)}
                >
                  <Text style={styles.emojiText}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 提醒天数 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('countdown.notifyDays')}
            </Text>
            <View style={styles.chipRow}>
              {NOTIFY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.notifyChip,
                    {
                      backgroundColor: notifyDays.includes(opt.value)
                        ? (color + '30') : theme.surfaceSecondary,
                      borderColor: notifyDays.includes(opt.value) ? color : theme.border,
                    },
                  ]}
                  onPress={() => toggleNotifyDay(opt.value)}
                >
                  <Text style={[
                    styles.notifyChipText,
                    { color: notifyDays.includes(opt.value) ? color : theme.textSecondary },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  cancelBtn: { fontSize: 16 },
  saveBtn: { fontSize: 16, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  typeEmoji: { fontSize: 14 },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: { fontSize: 20 },
  notifyChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  notifyChipText: { fontSize: 13, fontWeight: '600' },
});
