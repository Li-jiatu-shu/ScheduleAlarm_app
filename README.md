# 小舒日程闹钟 📅🔔

> 一款专为考研/备考人群设计的智能日程提醒App，支持一键导入日程文件，自动解析并生成每日定时提醒。

[![Version](https://img.shields.io/badge/version-1.2.0-pink)](package.json)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-blue)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61dafb)](https://reactnative.dev)

---

## ✨ 核心功能

- 📥 **一键导入**：支持 .md / .txt 日程文件导入或手动粘贴文本，自动解析阶段、日期、时间表
- ⏰ **三重提醒**：铃声 + 语音播报(TTS) + 全屏弹窗 + 振动，确保不错过任何任务
- 📋 **日程模板**：一次导入永久有效，每天自动生成当日任务，无需重复导入
- 📊 **数据统计**：完成率图表、热力图、连续打卡天数、阶段进度追踪
- 🎨 **卡通风格**：温暖可爱的视觉设计，浅色/深色模式自动切换
- 🔒 **完全离线**：所有数据仅存本地，不上传任何信息

## 📸 预览

```
┌─────────────────────────┐
│     📅  今天  周几      │
│  ⭐⭐⭐⭐☆  3/5 已完成  │
│  ┌─────────────────┐   │
│  │ ⏰ 08:10 - 11:30 │   │
│  │ 数学一攻坚       │   │
│  │ 看基础课视频...  │   │
│  └─────────────────┘   │
│  📋 接下来要做的事...  │
│  [🕐 14:00] [🕐 16:10]  │
├─────────────────────────┤
│  📅  │ 📥  │ 📊  │ ⚙️  │
│ 今日 │ 导入 │ 统计 │ 设置│
└─────────────────────────┘
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Expo CLI
- iOS 13+ / Android 8.0+

### 安装运行

```bash
# 安装依赖
cd ScheduleAlarm_app
npm install

# 启动开发服务器
npx expo start

# Android
npx expo run:android

# iOS
npx expo run:ios
```

### 导入日程

1. 点击底部「导入」Tab
2. 选择日程文件（.md/.txt）或粘贴文本
3. 预览解析结果
4. 确认导入，自动生成每日提醒

**日程文件格式示例**：参见项目根目录 `日程安排.md`

## 🏗️ 项目架构

```
src/
├── modules/
│   ├── parser/          # 日程文件解析引擎
│   ├── storage/         # AsyncStorage 数据库
│   ├── scheduler/       # 通知调度引擎
│   └── notifier/        # 铃声+TTS+振动提醒
├── screens/
│   ├── HomeScreen       # 主页（今日时间线）
│   ├── ImportScreen     # 日程导入
│   ├── StatsScreen      # 数据统计
│   ├── SettingsScreen   # 用户设置
│   └── EditTaskScreen   # 任务编辑
├── components/          # 通用组件库
├── context/             # 全局状态管理
├── hooks/               # 自定义 Hooks
├── utils/               # 工具函数/常量/主题
└── i18n/                # 国际化文案
```

## 📦 技术栈

| 库 | 用途 |
|---|------|
| React Native 0.86 | 跨平台框架 |
| Expo SDK 57 | 基础平台 |
| expo-notifications | 本地通知 |
| expo-speech | TTS 语音播报 |
| expo-audio | 闹钟铃声 |
| AsyncStorage | 本地存储 |
| React Navigation | 页面导航 |

## ⚠️ 发布前须知

- 替换 `assets/` 目录下的占位文件（铃声、图标、图片）
- Android 需真机测试熄屏铃声和后台通知
- iOS 需配置 Critical Alert 权限
- 详见「[代码开发进度.md](../代码开发进度.md)」中的检查清单

## 📄 许可证

MIT License © 2026 小舒日程闹钟
