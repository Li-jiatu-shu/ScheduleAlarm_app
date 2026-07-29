/**
 * 空状态占位组件
 * 用于数据为空时的引导展示
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function EmptyState({
  icon = '📋',
  title = '暂无数据',
  description = '',
  actionLabel = '',
  onAction,
  style,
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#FF7B9C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
