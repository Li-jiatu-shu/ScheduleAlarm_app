/**
 * DateWheelPicker — 跨平台日期滚轮选择器
 *
 * 三列滚轮：年 / 月 / 日。不依赖第三方原生模块，纯 JS 实现。
 * 自动处理闰年及每月天数。
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Platform,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

/** 当前年份起前后跨度 */
const YEAR_RANGE = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => CURRENT_YEAR - YEAR_RANGE + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export default function DateWheelPicker({ visible, date, onConfirm, onCancel }) {
  const initialDate = date ? new Date(date + 'T00:00:00') : new Date();
  const [selYear, setSelYear] = useState(initialDate.getFullYear());
  const [selMonth, setSelMonth] = useState(initialDate.getMonth() + 1);
  const [selDay, setSelDay] = useState(initialDate.getDate());

  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);

  // 月或年变化时修正日（如1月31日→2月28日）
  const maxDay = getDaysInMonth(selYear, selMonth);
  const safeDay = Math.min(selDay, maxDay);

  useEffect(() => {
    if (visible) {
      const d = date ? new Date(date + 'T00:00:00') : new Date();
      setSelYear(d.getFullYear());
      setSelMonth(d.getMonth() + 1);
      setSelDay(d.getDate());
      // 延迟滚动到选中位置
      setTimeout(() => {
        scrollTo(yearRef, YEARS.indexOf(d.getFullYear()));
        scrollTo(monthRef, d.getMonth()); // 0-indexed
        scrollTo(dayRef, d.getDate() - 1);
      }, 100);
    }
  }, [visible, date]);

  const scrollTo = (ref, index) => {
    if (ref.current) {
      ref.current.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
  };

  const handleConfirm = () => {
    const mm = String(selMonth).padStart(2, '0');
    const dd = String(safeDay).padStart(2, '0');
    onConfirm(`${selYear}-${mm}-${dd}`);
  };

  const renderColumn = (items, selected, onSelect, ref) => (
    <View style={styles.column}>
      {/* 遮罩高亮条 */}
      <View style={styles.highlight} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (items[index] !== undefined) onSelect(items[index]);
        }}
        onScrollEndDrag={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (items[index] !== undefined) onSelect(items[index]);
        }}
      >
        {items.map((val) => {
          const isSel = val === selected;
          return (
            <TouchableOpacity
              key={val}
              style={[styles.item, { height: ITEM_HEIGHT }]}
              onPress={() => {
                onSelect(val);
                scrollTo(ref, items.indexOf(val));
              }}
              activeOpacity={0.6}
            >
              <Text style={[styles.itemText, isSel && styles.itemTextSel]}>
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题栏 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelBtn}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>选择日期</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmBtn}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 滚轮区域 */}
          <View style={styles.pickerRow}>
            {renderColumn(YEARS, selYear, setSelYear, yearRef)}
            {renderColumn(MONTHS, selMonth, setSelMonth, monthRef)}
            {renderColumn(days, safeDay, setSelDay, dayRef)}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  container: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  cancelBtn: { fontSize: 16, color: '#8E8E93' },
  confirmBtn: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  pickerRow: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    paddingHorizontal: 10,
  },
  column: {
    flex: 1,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 6,
    right: 6,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#F0F0F5',
    zIndex: 0,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  itemTextSel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
