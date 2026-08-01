/**
 * CountdownManagerScreen — 倒计时管理页面
 *
 * 列出所有倒计时，支持新增、编辑、删除。
 * 点击倒计时卡片进入编辑模式。
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';
import CountdownCard, { calcDaysRemaining } from '../components/CountdownCard';
import CountdownEditor from '../components/CountdownEditor';
import EmptyState from '../components/EmptyState';
import * as Database from '../modules/storage/Database';

export default function CountdownManagerScreen({ navigation }) {
  const theme = useTheme();
  const [countdowns, setCountdowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState(null);

  const loadCountdowns = useCallback(async () => {
    try {
      const list = await Database.getCountdowns();
      setCountdowns(list);
    } catch (e) {
      console.warn('加载倒计时失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 每次页面聚焦时重新加载
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCountdowns();
    }, [loadCountdowns])
  );

  const handleAdd = () => {
    setEditingCountdown(null);
    setEditorVisible(true);
  };

  const handleEdit = (countdown) => {
    setEditingCountdown(countdown);
    setEditorVisible(true);
  };

  const handleSave = async (data) => {
    try {
      if (editingCountdown) {
        await Database.updateCountdown(editingCountdown.id, data);
      } else {
        await Database.addCountdown(data);
      }
      setEditorVisible(false);
      setEditingCountdown(null);
      await loadCountdowns();
    } catch (e) {
      Alert.alert('保存失败', e.message);
    }
  };

  const handleDelete = (countdown) => {
    Alert.alert(
      '确认删除',
      t('countdown.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Database.deleteCountdown(countdown.id);
              await loadCountdowns();
            } catch (e) {
              Alert.alert('删除失败', e.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* 顶部导航 */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.primary }]}>
            ← {t('common.back')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('countdown.title')}
        </Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ {t('countdown.add')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadCountdowns}
            tintColor={theme.primary} colors={[theme.primary]} />
        }
      >
        {countdowns.length === 0 ? (
          <EmptyState
            icon="⏳"
            title={t('countdown.noCountdowns')}
            description={t('countdown.noCountdownsHint')}
            actionLabel={t('countdown.add')}
            onAction={handleAdd}
          />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              共 {countdowns.length} 个倒计时
            </Text>
            {countdowns
              .sort((a, b) => calcDaysRemaining(a.targetDate) - calcDaysRemaining(b.targetDate))
              .map((c) => (
                <View key={c.id} style={styles.cardRow}>
                  <View style={styles.cardWrapper}>
                    <CountdownCard countdown={c} onPress={handleEdit} />
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: theme.danger + '15' }]}
                    onPress={() => handleDelete(c)}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 编辑弹窗 */}
      <CountdownEditor
        visible={editorVisible}
        countdown={editingCountdown}
        onSave={handleSave}
        onCancel={() => {
          setEditorVisible(false);
          setEditingCountdown(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardWrapper: { flex: 1 },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
