/**
 * CuteCard — 卡通风格卡片组件
 *
 * 带有按压弹跳动画、圆角、柔和阴影的卡片容器。
 * 可选的彩色装饰条和角落 emoji 装饰。
 */

import React, { useRef } from 'react';
import { Animated, TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';

export default function CuteCard({
  children,
  color,
  emoji,
  accentColor,
  onPress,
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: color || '#FFFFFF',
          transform: [{ scale }],
          ...Platform.select({
            ios: {
              shadowColor: accentColor || '#FFB5C2',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
            },
            android: {
              elevation: 6,
            },
          }),
        },
        style,
      ]}
    >
      {/* 左侧装饰条 */}
      {accentColor ? (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      ) : null}

      {/* 右上角 emoji 装饰 */}
      {emoji ? (
        <View style={styles.emojiBadge}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
      ) : null}

      {/* 内容 */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
  },
  emojiBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  content: {
    // children render here
  },
});
