/**
 * 确认对话框组件
 * 用于需要用户确认的操作（删除、清除等）
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';

export default function ConfirmDialog({
  visible = false,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmDestructive = false,
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        onPress={onCancel}
      >
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.modalBackground }]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {title}
            </Text>
          ) : null}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border },
              ]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                {cancelLabel || t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: confirmDestructive
                    ? theme.danger
                    : theme.primary,
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>
                {confirmLabel || t('common.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmButton: {},
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
