/**
 * 阶段筛选器组件
 * 用于按阶段筛选日程事件
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * @param {Object} props
 * @param {string[]} props.phases - 可用阶段列表
 * @param {string|null} props.selectedPhase - 当前选中的阶段
 * @param {(phase: string|null) => void} props.onSelect - 选择回调
 */
export default function PhaseFilter({ phases = [], selectedPhase = null, onSelect }) {
  const theme = useTheme();

  if (phases.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* 全部 */}
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: selectedPhase === null
              ? theme.primary
              : theme.surfaceSecondary,
            borderColor: selectedPhase === null
              ? theme.primary
              : theme.border,
          },
        ]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: selectedPhase === null
                ? '#FFFFFF'
                : theme.textSecondary,
            },
          ]}
        >
          全部
        </Text>
      </TouchableOpacity>

      {/* 各阶段 */}
      {phases.map((phase) => {
        const isSelected = selectedPhase === phase;
        const phaseColor = getPhaseColor(phase, theme);

        return (
          <TouchableOpacity
            key={phase}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? phaseColor.bg
                  : theme.surfaceSecondary,
                borderColor: isSelected
                  ? phaseColor.bg
                  : theme.border,
              },
            ]}
            onPress={() => onSelect(phase)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected
                    ? phaseColor.text
                    : theme.textSecondary,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {phase}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function getPhaseColor(phase, theme) {
  if (phase.includes('基础')) {
    return { bg: theme.phaseBase, text: theme.phaseBaseText };
  }
  if (phase.includes('强化')) {
    return { bg: theme.phaseIntensive, text: theme.phaseIntensiveText };
  }
  if (phase.includes('冲刺')) {
    return { bg: theme.phaseSprint, text: theme.phaseSprintText };
  }
  return { bg: theme.phaseBase, text: theme.phaseBaseText };
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
