/**
 * CountdownEditor — 倒计时编辑弹窗
 *
 * 输入事件名称 + 滚轮选择目标日期。
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';
import { formatDate } from '../utils/helpers';
import DateWheelPicker from './DateWheelPicker';

/** 日期格式验证 */
function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d instanceof Date && !isNaN(d.getTime());
}

/** 格式化日期为友好显示 "2026年8月15日 周六"（本地时间，无时区问题） */
function formatDateDisplay(dateStr) {
  if (!isValidDate(dateStr)) return '请选择日期';
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(y, m - 1, d);
  const weekday = weekdays[date.getDay()];
  return `${y}年${m}月${d}日 周${weekday}`;
}

export default function CountdownEditor({ visible, countdown, onSave, onCancel }) {
  const theme = useTheme();
  const isEdit = !!countdown;

  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (visible) {
      if (countdown) {
        setTitle(countdown.title || '');
        setTargetDate(countdown.targetDate || '');
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        setTitle('');
        setTargetDate(formatDate(defaultDate));
      }
    }
  }, [visible, countdown]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('提示', '请输入倒计时事件名称');
      return;
    }
    if (!isValidDate(targetDate)) {
      Alert.alert('提示', '请选择目标日期');
      return;
    }

    onSave({
      ...(countdown || {}),
      title: trimmedTitle,
      targetDate,
    });
  };

  const handleDateConfirm = (dateStr) => {
    setTargetDate(dateStr);
    setPickerVisible(false);
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
              {isEdit ? '编辑倒计时' : '添加倒计时'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.saveBtn, { color: theme.primary }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 事件名称 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              事件名称
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.surfaceSecondary,
                color: theme.textPrimary,
                borderColor: theme.border,
              }]}
              placeholder="例如：高考、考研、项目截止日"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={30}
              autoFocus
            />

            {/* 目标日期 — 点击弹出滚轮选择器 */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              目标日期
            </Text>
            <TouchableOpacity
              style={[styles.datePickerBtn, {
                backgroundColor: theme.surfaceSecondary,
                borderColor: theme.border,
              }]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.datePickerBtnIcon]}>📅</Text>
              <Text style={[styles.datePickerBtnText, {
                color: isValidDate(targetDate) ? theme.textPrimary : theme.textTertiary,
              }]}>
                {formatDateDisplay(targetDate)}
              </Text>
              <Text style={[styles.datePickerArrow, { color: theme.textTertiary }]}>▼</Text>
            </TouchableOpacity>

            {/* 预览 */}
            {isValidDate(targetDate) && title.trim() ? (
              <View style={[styles.preview, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                  预览效果
                </Text>
                <Text style={[styles.previewText, { color: theme.textPrimary }]}>
                  距离{title.trim()}还剩{' '}
                  <Text style={{ color: theme.primary, fontWeight: '800' }}>N</Text>
                  {' '}天
                </Text>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        {/* 日期滚轮选择器 */}
        <DateWheelPicker
          visible={pickerVisible}
          date={targetDate}
          onConfirm={handleDateConfirm}
          onCancel={() => setPickerVisible(false)}
        />
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
    maxHeight: '75%',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },

  // 日期选择按钮
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  datePickerBtnIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 16,
  },
  datePickerArrow: {
    fontSize: 12,
    marginLeft: 8,
  },

  preview: {
    marginTop: 24,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
