/**
 * 加载覆盖层组件
 * 用于展示全局加载状态
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function LoadingOverlay({ visible = false, message = '加载中...' }) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
      <View style={[styles.container, { backgroundColor: theme.modalBackground }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
  },
});
