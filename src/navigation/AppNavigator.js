/**
 * 应用导航配置
 *
 * 底部 Tab 导航 + Stack 导航组合。
 * Tab: 首页 | 导入 | 统计 | 设置
 * Stack: 编辑任务页（从首页推入）
 */

import React from 'react';
import { Platform, View, Text, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ImportScreen from '../screens/ImportScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditTaskScreen from '../screens/EditTaskScreen';

import { useSettings } from '../context/SettingsContext';
import { LightTheme, DarkTheme as AppDarkTheme } from '../utils/theme';
import { t } from '../i18n';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 首页 Stack（包含编辑页）
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{
          headerShown: true,
          headerTitle: t('edit.title'),
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

// 底部 Tab
function MainTabs() {
  const systemColorScheme = useColorScheme();
  const { getSetting } = useSettings();

  const themeMode = getSetting('themeMode') || 'auto';
  let isDark;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    isDark = systemColorScheme === 'dark';
  }

  const appTheme = isDark ? AppDarkTheme : LightTheme;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appTheme.tabBarActive,
        tabBarInactiveTintColor: appTheme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: appTheme.tabBarBackground,
          borderTopColor: appTheme.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📅" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ImportTab"
        component={ImportScreen}
        options={{
          tabBarLabel: t('tabs.import'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📥" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: t('tabs.stats'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📊" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Tab 图标（使用 Emoji 代替图标库）
function TabIcon({ icon }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
  );
}

// 导航容器
export default function AppNavigator() {
  const systemColorScheme = useColorScheme();
  const { getSetting } = useSettings();

  const themeMode = getSetting('themeMode') || 'auto';
  let isDark;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    isDark = systemColorScheme === 'dark';
  }

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: AppDarkTheme.background,
          card: AppDarkTheme.surface,
          text: AppDarkTheme.textPrimary,
          border: AppDarkTheme.border,
          primary: AppDarkTheme.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: LightTheme.background,
          card: LightTheme.surface,
          text: LightTheme.textPrimary,
          border: LightTheme.border,
          primary: LightTheme.primary,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}
