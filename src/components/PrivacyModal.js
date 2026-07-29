/**
 * 隐私政策弹窗
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export default function PrivacyModal({ visible, onClose }) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: theme.primary }]}>关闭</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>隐私政策</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            小舒日程闹钟 隐私政策
          </Text>
          <Text style={[styles.updated, { color: theme.textTertiary }]}>
            更新日期：2026年7月26日
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            一、信息收集
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            本应用是一款完全离线的日程提醒工具，不会收集、存储或上传您的任何个人信息。您导入的日程数据仅保存在设备本地存储中。
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            二、数据存储
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            所有日程安排、任务事件、提醒设置等数据均存储于您的设备本地（AsyncStorage），不会上传至任何服务器。您可以通过应用内的"清除所有数据"功能随时删除所有数据。
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            三、权限使用
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            为提供完整的提醒功能，本应用可能申请以下权限：{'\n'}
            • 通知权限 — 用于在指定时间发送日程提醒{'\n'}
            • 振动权限 — 用于提醒时的振动反馈{'\n'}
            • 存储权限 — 用于导入日程文件{'\n'}
            • 音频权限 — 用于播放提醒铃声和语音播报{'\n'}
            以上权限仅在您主动使用相关功能时才会被调用。
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            四、第三方服务
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            本应用不使用任何第三方分析、统计或广告服务。语音播报功能使用设备内置的 TTS（文字转语音）引擎，完全离线运行。
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            五、儿童隐私
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            本应用不针对 13 岁以下儿童设计，我们不会有意收集儿童的个人信息。
          </Text>

          <Text style={[styles.section, { color: theme.textPrimary }]}>
            六、联系我们
          </Text>
          <Text style={[styles.p, { color: theme.textSecondary }]}>
            如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：{'\n'}
            邮箱：support@xiaoshuapp.com{'\n'}
            反馈渠道：应用内「设置 → 意见反馈」
          </Text>

          <View style={styles.spacer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  updated: { fontSize: 13, marginBottom: 24 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 24 },
  spacer: { height: 40 },
});
