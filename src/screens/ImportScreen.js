/**
 * 导入页面
 *
 * 支持文件选择、文本粘贴和解析结果预览，
 * 确认后导入到数据库并调度通知。
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSchedule } from '../context/ScheduleContext';
import { useTheme } from '../hooks/useTheme';
import { parseSchedule } from '../modules/parser/ScheduleParser';
import * as NotificationScheduler from '../modules/scheduler/NotificationScheduler';
import * as Database from '../modules/storage/Database';
import { useSettings } from '../context/SettingsContext';
import LoadingOverlay from '../components/LoadingOverlay';
import ConfirmDialog from '../components/ConfirmDialog';
import { t } from '../i18n';
import { SUPPORTED_FILE_TYPES } from '../utils/constants';

export default function ImportScreen({ navigation }) {
  const theme = useTheme();
  const schedule = useSchedule();
  const { settings } = useSettings();

  const [mode, setMode] = useState('select'); // 'select' | 'paste' | 'preview'
  const [pastedText, setPastedText] = useState('');
  const [parsedEvents, setParsedEvents] = useState([]);
  const [parsedPhases, setParsedPhases] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1); // 正在编辑的条目索引
  const [editData, setEditData] = useState(null);       // 编辑中的临时数据

  const startEditing = (index) => {
    const item = parsedEvents[index];
    setEditingIndex(index);
    setEditData({
      phase: item.phase,
      date: item.date,
      startTime: item.start_time || item.startTime,
      endTime: item.end_time || item.endTime,
      title: item.title,
      content: item.content || '',
    });
  };

  const saveEdit = () => {
    if (!editData || editingIndex < 0) return;
    const updated = [...parsedEvents];
    updated[editingIndex] = {
      ...updated[editingIndex],
      phase: editData.phase,
      date: editData.date,
      start_time: editData.startTime,
      end_time: editData.endTime,
      title: editData.title,
      content: editData.content,
    };
    setParsedEvents(updated);
    setEditingIndex(-1);
    setEditData(null);
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditData(null);
  };

  const deleteParsedItem = (index) => {
    Alert.alert('删除确认', `确定要删除"${parsedEvents[index].title}"吗？`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          const updated = parsedEvents.filter((_, i) => i !== index);
          setParsedEvents(updated);
          if (updated.length === 0) {
            setMode('select');
          }
        },
      },
    ]);
  };

  // 文件选择
  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_FILE_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setLoading(true);
      setLoadingMessage('正在读取文件...');

      // 读取文件内容
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'utf8',
      });

      // 解析
      const parseResult = parseSchedule(content);
      handleParseResult(parseResult);
    } catch (err) {
      Alert.alert(t('common.error'), '读取文件失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 粘贴文本
  const handlePasteText = useCallback(() => {
    setMode('paste');
    setPastedText('');
    setParsedEvents([]);
    setParseErrors([]);
  }, []);

  // 解析粘贴的文本
  const handleParsePasted = useCallback(() => {
    if (!pastedText.trim()) {
      Alert.alert(t('common.warning'), '请输入日程文本内容');
      return;
    }

    const parseResult = parseSchedule(pastedText);
    handleParseResult(parseResult);
  }, [pastedText]);

  // 处理解析结果
  const handleParseResult = (parseResult) => {
    setParsedEvents(parseResult.events);
    setParsedPhases(parseResult.phases);
    setParseErrors(parseResult.errors);

    if (parseResult.events.length > 0) {
      setMode('preview');
    } else {
      Alert.alert(
        t('import.parseError'),
        parseResult.errors.length > 0
          ? parseResult.errors[0].message
          : t('import.noEventsFound')
      );
    }
  };

  // 确认导入
  const handleConfirmImport = useCallback(async () => {
    if (parsedEvents.length === 0) return;

    setShowConfirm(true);
  }, [parsedEvents]);

  const doImport = useCallback(async () => {
    setShowConfirm(false);
    setLoading(true);
    setLoadingMessage('正在导入日程...');

    try {
      // 1. 提取模板：从解析事件中提取每日时间表模板（去重）
      const templateMap = new Map();
      for (const e of parsedEvents) {
        const tKey = `${e.phase}_${e.start_time}_${e.title}`;
        if (!templateMap.has(tKey)) {
          templateMap.set(tKey, {
            phase: e.phase,
            startTime: e.start_time,
            endTime: e.end_time,
            title: e.title,
            content: e.content,
            enabled: e.enabled,
          });
        }
      }
      const templates = Array.from(templateMap.values());

      // 2. 保存模板（一次导入，永久有效）
      await Database.saveScheduleTemplates(templates);

      // 3. 存入事件数据
      await schedule.importEvents(parsedEvents);

      // 4. 调度通知
      await NotificationScheduler.scheduleEventNotifications(
        parsedEvents,
        {
          advanceMinutes: settings.advanceMinutes || 0,
          quietStart: settings.quietStartTime || '23:00',
          quietEnd: settings.quietEndTime || '06:00',
          ttsEnabled: settings.ttsEnabled !== false,
        }
      );

      Alert.alert(
        t('common.success'),
        t('import.importSuccess', { count: parsedEvents.length }),
        [
          {
            text: t('common.confirm'),
            onPress: () => {
              setMode('select');
              setParsedEvents([]);
              setParseErrors([]);
              setPastedText('');
              navigation.navigate('HomeTab');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(t('import.importFailed'), err.message);
    } finally {
      setLoading(false);
    }
  }, [parsedEvents, schedule, settings, navigation]);

  // 渲染解析预览项
  const renderPreviewItem = ({ item, index }) => {
    const isEditing = editingIndex === index;
    const data = isEditing ? editData : null;

    return (
      <TouchableOpacity
        style={[
          styles.previewItem,
          { backgroundColor: theme.surface, borderColor: isEditing ? theme.primary : theme.border },
        ]}
        onPress={() => !isEditing && startEditing(index)}
        activeOpacity={0.7}
      >
        {isEditing ? (
          // ---- 编辑模式 ----
          <View style={styles.editForm}>
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="日期 YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                value={data.date}
                onChangeText={(v) => setEditData({ ...data, date: v })}
              />
              <TextInput
                style={[styles.editInputSmall, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="开始"
                placeholderTextColor={theme.textTertiary}
                value={data.startTime}
                onChangeText={(v) => setEditData({ ...data, startTime: v })}
              />
              <TextInput
                style={[styles.editInputSmall, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="结束"
                placeholderTextColor={theme.textTertiary}
                value={data.endTime}
                onChangeText={(v) => setEditData({ ...data, endTime: v })}
              />
            </View>
            <TextInput
              style={[styles.editInputHalf, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="阶段"
              placeholderTextColor={theme.textTertiary}
              value={data.phase}
              onChangeText={(v) => setEditData({ ...data, phase: v })}
            />
            <TextInput
              style={[styles.editInput, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="任务标题"
              placeholderTextColor={theme.textTertiary}
              value={data.title}
              onChangeText={(v) => setEditData({ ...data, title: v })}
            />
            <TextInput
              style={[styles.editInputMultiline, { backgroundColor: theme.surfaceSecondary, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="具体内容（可选）"
              placeholderTextColor={theme.textTertiary}
              value={data.content}
              onChangeText={(v) => setEditData({ ...data, content: v })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: theme.danger + '20' }]}
                onPress={() => deleteParsedItem(index)}
              >
                <Text style={[styles.editBtnText, { color: theme.danger }]}>删除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={cancelEdit}
              >
                <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: theme.primary }]}
                onPress={saveEdit}
              >
                <Text style={[styles.editBtnText, { color: '#FFF' }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ---- 预览模式 ----
          <>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewPhase, { color: theme.primary }]}>
                {item.phase}
              </Text>
              <View style={styles.previewHeaderRight}>
                <Text style={[styles.editHint, { color: theme.textTertiary }]}>
                  点击编辑
                </Text>
                <Text style={[styles.previewIndex, { color: theme.textTertiary }]}>
                  #{index + 1}
                </Text>
              </View>
            </View>
            <Text style={[styles.previewTitle, { color: theme.textPrimary }]}>
              {item.title}
            </Text>
            <View style={styles.previewMeta}>
              <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
                {item.date} {item.start_time || item.startTime}
                {(item.end_time || item.endTime) ? ` - ${item.end_time || item.endTime}` : ''}
              </Text>
              {item.repeat && (
                <Text style={[styles.repeatBadge, { color: theme.info }]}>
                  每日重复
                </Text>
              )}
            </View>
            {item.content ? (
              <Text
                style={[styles.previewContent, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {item.content}
              </Text>
            ) : null}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* 标题 */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('import.title')}
        </Text>

        {mode === 'select' && (
          <View style={styles.selectContainer}>
            {/* 文件选择按钮 */}
            <TouchableOpacity
              style={[styles.importOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handlePickFile}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>📁</Text>
              <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                {t('import.selectFile')}
              </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                {t('import.fileSupported')}
              </Text>
            </TouchableOpacity>

            {/* 粘贴文本按钮 */}
            <TouchableOpacity
              style={[styles.importOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handlePasteText}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>📝</Text>
              <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                {t('import.pasteText')}
              </Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                直接粘贴日程安排文本内容
              </Text>
            </TouchableOpacity>

            {/* 已有日程提示 */}
            {schedule.events.length > 0 && (
              <View style={[styles.existingInfo, { backgroundColor: theme.phaseBase }]}>
                <Text style={[styles.existingText, { color: theme.phaseBaseText }]}>
                  当前已有 {schedule.events.length} 个日程事件，导入将合并新日程（相同日期+时间的任务会更新内容）
                </Text>
              </View>
            )}
          </View>
        )}

        {mode === 'paste' && (
          <View style={styles.pasteContainer}>
            <TextInput
              style={[
                styles.pasteInput,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('import.pastePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              value={pastedText}
              onChangeText={setPastedText}
            />
            <View style={styles.pasteActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setMode('select')}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parseBtn, { backgroundColor: theme.primary }]}
                onPress={handleParsePasted}
                activeOpacity={0.7}
              >
                <Text style={styles.parseBtnText}>开始解析</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'preview' && (
          <View style={styles.previewContainer}>
            {/* 解析结果摘要 */}
            <View style={[styles.parseSummary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>
                {t('import.parseSuccess')}
              </Text>
              <Text style={[styles.summaryCount, { color: theme.primary }]}>
                {t('import.eventsFound').replace('{count}', parsedEvents.length)}
              </Text>
              {parsedPhases.length > 0 && (
                <Text style={[styles.summaryPhases, { color: theme.textSecondary }]}>
                  识别到 {parsedPhases.length} 个阶段：
                  {parsedPhases.map((p) => p.name).join('、')}
                </Text>
              )}
              {parseErrors.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: theme.taskPending }]}>
                  <Text style={[styles.errorBoxText, { color: theme.taskPendingText }]}>
                    ⚠ 有 {parseErrors.length} 个警告（可忽略或返回修改）
                  </Text>
                </View>
              )}
            </View>

            {/* 预览列表 */}
            <FlatList
              data={parsedEvents.slice(0, 100)} // 限制预览数量
              keyExtractor={(item, index) => `${item.title}_${index}`}
              renderItem={renderPreviewItem}
              contentContainerStyle={styles.previewList}
              showsVerticalScrollIndicator={false}
            />

            {/* 底部按钮 */}
            <View style={[styles.previewActions, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => {
                  setMode('select');
                  setParsedEvents([]);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: theme.success }]}
                onPress={handleConfirmImport}
                activeOpacity={0.7}
              >
                <Text style={styles.importBtnText}>
                  {t('import.confirmImport')} ({parsedEvents.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 加载覆盖层 */}
      <LoadingOverlay visible={loading} message={loadingMessage} />

      {/* 确认覆盖对话框 */}
      <ConfirmDialog
        visible={showConfirm}
        title={t('common.warning')}
        message={t('import.overwriteWarning')}
        confirmLabel={t('import.confirmImport')}
        onConfirm={doImport}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  importOption: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  existingInfo: {
    borderRadius: 12,
    padding: 14,
  },
  existingText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  pasteContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pasteInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 200,
  },
  pasteActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  parseBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  parseSummary: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryPhases: {
    fontSize: 13,
  },
  errorBox: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  errorBoxText: {
    fontSize: 12,
  },
  previewList: {
    paddingBottom: 16,
  },
  previewItem: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewPhase: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewIndex: {
    fontSize: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  previewTime: {
    fontSize: 12,
  },
  repeatBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  previewContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  importBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 编辑模式样式
  editForm: { gap: 8 },
  editRow: { flexDirection: 'row', gap: 8 },
  editInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  editInputSmall: {
    width: 70,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
  },
  editInputHalf: {
    width: '50%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  editInputMultiline: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editHint: {
    fontSize: 10,
    marginRight: 8,
  },
  previewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
