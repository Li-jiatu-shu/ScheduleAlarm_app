# Changelog

All notable changes to 小舒日程闹钟 will be documented in this file.

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
