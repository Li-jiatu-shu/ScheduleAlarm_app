# Changelog

All notable changes to 小舒日程闹钟 will be documented in this file.

---

## [1.2.1] — 2026-07-31

### 🔧 Fixed
- **前台报警队列机制**：修复 v1.2.0 中"13:30后无弹窗提醒"的严重 bug。根因是单报警模型导致 `alarmVisible` 阻塞所有后续检查，且补偿窗口仅2分钟。现已重构为报警队列模式：扫描所有匹配事件 → 排队 → 依次触发 → 自动处理队列。
- 补偿检查窗口从 ±5 分钟扩展至 ±30 分钟
- 前台系统通知现在会触发 ReminderModal（修复空监听器）

### ✨ Added
- **倒计时功能**：用户可手动设置目标日期并定义意义（考试、报名、截止等），支持同时显示多个倒计时，在首页以紧凑卡片形式展示剩余天数
  - `CountdownCard` — 倒计时卡片（紧凑/完整两种模式，天数越近颜色越紧急）
  - `CountdownEditor` — 可视化编辑弹窗（日期输入、类型选择、颜色、图标、提醒天数）
  - `CountdownManagerScreen` — 倒计时管理页面（增删改查）
- **番茄钟计时器**：25分钟工作 / 5分钟休息循环，每4个番茄钟后长休息15分钟。首页浮动按钮唤起。
- **数据导出**：支持将全部日程导出为可读文本格式，通过系统分享面板发送
- **多日程方案切换**：支持保存/加载/删除命名日程方案，可在不同日程配置间快速切换

### 🔄 Changed
- `useAlarmChecker.js`：完全重写为报警队列模式
- `useNotifications.js`：新增前台通知处理器注册机制
- `NotificationScheduler.js`：`findMissedEvents` 窗口扩展至 ±30分钟
- `App.js`：桥接前台通知处理器与报警触发器
- `HomeScreen.js`：新增倒计时展示区 + 番茄钟浮动按钮
- `Database.js`：新增倒计时 CRUD + 日程方案管理
- `AppNavigator.js`：新增 CountdownManager 路由
- `SettingsScreen.js`：数据导出功能、日程方案管理、版本号更新
- `zh.js`：新增 countdown 翻译段
- 版本号升级至 v1.2.1

### 📝 Files Changed
| 文件 | 操作 |
|------|------|
| `src/hooks/useAlarmChecker.js` | 重写 |
| `src/hooks/useNotifications.js` | 修改 |
| `src/modules/scheduler/NotificationScheduler.js` | 修改 |
| `App.js` | 修改 |
| `src/modules/storage/Database.js` | 修改 |
| `src/screens/HomeScreen.js` | 修改 |
| `src/screens/SettingsScreen.js` | 修改 |
| `src/navigation/AppNavigator.js` | 修改 |
| `src/i18n/zh.js` | 修改 |
| `src/components/CountdownCard.js` | 新增 |
| `src/components/CountdownEditor.js` | 新增 |
| `src/components/PomodoroTimer.js` | 新增 |
| `src/screens/CountdownManagerScreen.js` | 新增 |

---

## [1.2.0] — 2026-07-29

### 🔧 Fixed
- **语音播报等待机制**：替换原有的5秒倒计时自动进入逻辑，改为等待 TTS 语音播报完成后再自动开始执行任务。用户可在语音播放期间随时手动操作。
- **熄屏铃声提醒**：修复熄屏/锁屏状态下仅有振动无铃声的问题。现在使用 `expo-audio` 播放循环闹钟铃声，同步配合振动和弹窗提醒。优化 Android 通知频道配置（ALARM 音频用途 + 绕过勿扰模式）。

### 📥 Added
- **日程模板机制**：实现一次导入永久有效。导入时自动保存日程模板（每日时间表），应用启动时自动从模板生成当天及未来7天的事件，无需每日重复导入。
- **日程模板管理函数**：`saveScheduleTemplates`、`getScheduleTemplates`、`generateEventsFromTemplates`、`ensureFutureEvents`
- 新增 `assets/alarm-sound.wav` 闹钟铃声占位文件

### 🔄 Changed
- `Notifier.js`：`speakEvent()` 新增 `onDone`/`onStart`/`onError` 回调；重写 `playAlarm()` 使用 expo-audio
- `useAlarmChecker.js`：重构提醒触发流程，管理铃声+TTS+弹窗的协作状态
- `ReminderModal.js`：移除5秒倒计时，新增语音状态指示器（"正在语音播报..." → "播报完成"）
- `useNotifications.js`：增强 Android 通知频道配置（importance: MAX, bypassDnd, lockScreen: PUBLIC）
- `ScheduleContext.js`：启动时自动生成未来事件、加载阶段、调度通知的协同初始化
- `Database.js`：新增模板 CRUD 和自动生成逻辑
- `ImportScreen.js`：导入时同步保存事件和模板
- 版本号统一升级至 v1.2.0

### 📝 Files Changed
| 文件 | 操作 |
|------|------|
| `src/modules/notifier/Notifier.js` | 修改 |
| `src/hooks/useAlarmChecker.js` | 修改 |
| `src/components/ReminderModal.js` | 修改 |
| `src/hooks/useNotifications.js` | 修改 |
| `src/context/ScheduleContext.js` | 修改 |
| `src/modules/storage/Database.js` | 修改 |
| `src/screens/ImportScreen.js` | 修改 |
| `App.js` | 修改 |
| `package.json` | 版本号 |
| `app.json` | 版本号 |
| `assets/alarm-sound.wav` | 新增占位 |

---

## [1.1.0] — 2026-07-26

### Added
- 初始版本发布
- 日程文件解析引擎（Markdown/纯文本）
- 本地 AsyncStorage 数据库
- 基于 expo-notifications 的提醒调度
- TTS 语音播报 + 振动提醒
- 卡通风格 UI（浅色/深色主题）
- 主页时间线、导入页、设置页、统计页、编辑页
- 隐私政策弹窗
- 日期导航与阶段筛选
- 完成率统计与热力图
