/**
 * 简体中文翻译
 */

export default {
  app: {
    name: '小舒日程闹钟',
    tagline: '智能日程提醒',
  },

  tabs: {
    home: '今日',
    import: '导入',
    stats: '统计',
    settings: '设置',
  },

  home: {
    title: '今日日程',
    noEvents: '今天还没有安排日程',
    noEventsHint: '点击下方"导入"按钮开始使用',
    today: '今天',
    yesterday: '昨天',
    tomorrow: '明天',
    timeline: '时间线',
    noData: '暂无数据',
    loadError: '加载失败，请重试',
    motivationFull: '全部完成！太厉害了 🎉',
    motivationGood: '进展不错，继续加油 💪',
    motivationStart: '新的一天开始啦 ☀️',
    upcomingTasks: '接下来要做的事...',
  },

  import: {
    title: '导入日程',
    selectFile: '选择文件',
    pasteText: '粘贴文本',
    preview: '预览结果',
    confirmImport: '确认导入',
    cancelImport: '取消',
    fileSupported: '支持 .md / .txt 格式的日程文件',
    pastePlaceholder: '请在此粘贴日程安排文本内容...',
    parseError: '解析错误',
    parseSuccess: '解析成功',
    eventsFound: '共识别 {count} 个日程事件',
    noEventsFound: '未能识别到有效的日程事件',
    overwriteWarning: '新日程将与现有日程合并，相同日期+时间的任务会更新内容。是否继续？',
    mergeInfo: '新日程将与现有日程合并，相同日期+时间的任务会更新内容',
    importing: '正在导入...',
    importSuccess: '导入完成，共 {count} 个日程',
    importFailed: '导入失败',
  },

  edit: {
    title: '编辑任务',
    save: '保存',
    delete: '删除',
    deleteConfirm: '确定要删除这个任务吗？',
    phase: '所属阶段',
    date: '日期',
    startTime: '开始时间',
    endTime: '结束时间',
    taskTitle: '任务标题',
    content: '具体内容',
    enabled: '启用提醒',
    completed: '已完成',
    fieldRequired: '此项为必填',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
  },

  settings: {
    title: '设置',
    reminder: '提醒设置',
    sound: '声音设置',
    display: '显示设置',
    wakeUp: '起床闹钟',
    about: '关于',

    // 提醒设置
    advanceTime: '提前提醒',
    advanceTimeDesc: '提前 {minutes} 分钟提醒',
    onTime: '准时提醒',
    minutes: '分钟',

    quietHours: '静默时段',
    quietHoursDesc: '该时段内仅记录日志，不触发语音',
    quietStart: '开始时间',
    quietEnd: '结束时间',

    snoozeOptions: '稍后提醒选项',
    snoozeCustom: '自定义',

    // 声音设置
    ttsEnabled: '语音播报',
    ttsEnabledDesc: '提醒时自动朗读任务内容',
    ttsSpeed: '播报语速',
    ttsSpeedSlow: '慢',
    ttsSpeedNormal: '正常',
    ttsSpeedFast: '快',
    ttsTest: '测试语音',
    ttsTestButton: '试听',

    alarmVolume: '闹铃音量',
    ringtone: '铃声选择',
    ringtoneSystem: '系统默认',
    ringtoneCustom: '自定义铃声',
    ringtoneAlarm: '短促闹铃',
    ringtoneAlarmDesc: 'alarm-sound.wav — 适合日程提醒',
    ringtoneClock: '长音频铃声',
    ringtoneClockDesc: 'clock-sound.wav — 适合起床闹钟',
    forceVolume: '强制音量',
    forceVolumeDesc: '静音/振动模式下仍播放铃声',

    // 起床闹钟
    wakeUpEnabled: '启用起床闹钟',
    wakeUpEnabledDesc: '每天定时响铃并播报当日日程',
    wakeUpTime: '起床时间',
    wakeUpSound: '起床铃声',
    wakeUpVolume: '起床铃声音量',
    wakeUpTest: '测试起床铃声',

    // 铃声管理
    ringtoneManagement: '铃声管理',
    customRingtone: '自定义强力铃声',
    customRingtoneDesc: '上传音频文件作为强力铃声（起床/午休等时段使用）',
    customRingtoneSet: '已上传自定义铃声',
    customRingtoneNotSet: '未上传，使用内置强力铃声',
    customRingtoneUpload: '上传铃声',
    clearCustomRingtone: '恢复默认铃声',
    clearCustomRingtoneDesc: '使用内置 clock-sound.wav',
    testStrongRingtone: '试听强力铃声',
    testNormalRingtone: '试听日常提醒铃声',

    // 强力铃声时段
    strongRingtoneSlots: '强力铃声时段',
    strongRingtoneSlotsHint: '在这些时段内使用强力铃声（自定义或clock-sound.wav），其他时段使用日常提醒铃声',
    addStrongSlot: '添加强力铃声时段',
    removeSlot: '移除',
    morningSlot: '早晨 6:00-8:00',
    noonSlot: '午间 12:00-14:00',
    eveningSlot: '晚间 21:00-23:00',
    slotAdded: '时段已添加',

    // 午休闹钟
    napAlarm: '午休闹钟',
    napAlarmEnabled: '启用午休闹钟',
    napAlarmEnabledDesc: '每天定时提醒午休（使用强力铃声）',
    napAlarmTime: '午休时间',

    // 显示设置
    theme: '主题模式',
    themeAuto: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',

    dailySummary: '每日摘要提醒',
    dailySummaryDesc: '每天定时推送今日任务摘要',

    autoLog: '自动记录',
    autoLogDesc: '完成任务后自动记录时间',

    // 关于
    version: '版本',
    privacy: '隐私政策',
    feedback: '意见反馈',
    sourceCode: '源代码',

    // 数据管理
    dataManagement: '数据管理',
    exportData: '导出数据',
    exportDataDesc: '导出所有日程为文本文件',
    clearData: '清除所有数据',
    clearDataConfirm: '确定要清除所有数据吗？此操作不可撤销。',
    dataCleared: '数据已清除',
  },

  reminder: {
    startTask: '开始执行',
    snooze: '稍后提醒',
    skip: '跳过任务',
    snoozeMinutes: '{minutes} 分钟后提醒',
    taskStart: '即将开始',
    autoStartCountdown: '{seconds}秒后自动开始...',
    nowExecuting: '现在时间是 {time}',
    pleaseExecute: '请执行任务：{title}',
    content: '具体内容：{content}',
  },

  stats: {
    title: '数据统计',
    todayCompletion: '今日完成率',
    weeklyCompletion: '本周完成率',
    totalCompletion: '总完成率',
    completed: '已完成',
    pending: '待完成',
    skipped: '已跳过',
    total: '总计',
    heatmap: '完成热力图',
    delayReport: '拖延分析',
    noData: '暂无统计数据',
    bestDay: '最佳日',
    worstDay: '最差日',
    streak: '连续完成天数',
  },

  status: {
    completed: '已完成',
    pending: '待完成',
    skipped: '已跳过',
    delayed: '已推迟',
  },

  countdown: {
    title: '倒计时',
    add: '添加倒计时',
    edit: '编辑倒计时',
    daysRemaining: '还剩 {days} 天',
    daysRemainingShort: '{days}天',
    today: '就是今天！',
    passed: '已过 {days} 天',
    noCountdowns: '还没有倒计时',
    noCountdownsHint: '添加考试、报名等重要日期',
    targetDate: '目标日期',
    countdownTitle: '倒计时名称',
    type: '类型',
    color: '颜色',
    emoji: '图标',
    notifyDays: '提前提醒',
    types: {
      exam: '考试',
      registration: '报名',
      deadline: '截止',
      meeting: '会议',
      travel: '出行',
      birthday: '生日',
      holiday: '节日',
      other: '其他',
    },
    deleteConfirm: '确定要删除这个倒计时吗？',
    saveSuccess: '倒计时已保存',
    deleteSuccess: '倒计时已删除',
    dayOptions: {
      d1: '1天前',
      d3: '3天前',
      d7: '7天前',
      d14: '14天前',
      d30: '30天前',
    },
  },

  // 组件通用文案
  component: {
    all: '全部',
    today: '今天',
    yesterday: '昨天',
    tomorrow: '明天',
    manage: '管理',
    add_item: '添加',
    loading: '加载中...',
    noData: '暂无数据',
    comingSoon: '即将上线',
    saveFailed: '保存失败',
    deleteConfirm: '确认删除',
    deleteFailed: '删除失败',
    editHint: '点击编辑',
    startParsing: '开始解析',
    testRingtone: '试听 提醒铃声',
    testWakeUp: '测试起床铃声',
  },

  // 进度星星
  progress: {
    waitingForTasks: '等待今日任务...',
    allDone: '全部完成！太厉害了 🎉',
    greatProgress: '进展不错，继续加油 💪',
    newDay: '新的一天开始啦 ☀️',
    keepGoing: '还有任务，继续努力 📝',
    almostDone: '快完成了，坚持就是胜利 🌟',
    halfDone: '完成一半了，真棒 👍',
    completed: '{completed}/{total} 已完成',
  },

  // 时间线
  timeline: {
    ongoing: '正在进行中...',
    upcoming: '即将开始的任务',
    now: '🔔 正在进行',
    soon: '📌 即将开始',
    base: '基础',
    intensive: '强化',
    sprint: '冲刺',
  },

  // 番茄钟
  pomodoro: {
    ready: '准备开始',
    working: '🍅 专注工作中',
    resting: '☕ 休息一下',
    longRest: '🎉 长休息',
    running: '进行中...',
    paused: '已暂停',
    tapToStart: '点击开始',
    noPomodoros: '完成番茄钟将显示在这里',
    startFocus: '开始专注',
    pause: '⏸ 暂停',
    resume: '▶ 继续',
    reset: '↺ 重置',
    totalCompleted: '本次已完成 {count} 个番茄钟',
  },

  // 起床闹钟
  wakeUp: {
    ringing: '🌅 起床闹钟',
    greeting: '早上好！现在是 {time}，该起床了。',
    noSchedule: '今天没有安排日程，享受美好的一天吧！',
    todaySchedule: '今天共有{count}个日程，{list}',
    voicePlaying: '正在播报早安问候...',
    voiceDone: '早安播报完成',
    wakeUpNow: '🌅 起床啦！',
    snoozeMore: '再睡一会',
    minutesLater: '{minutes} 分钟后',
    dismiss: '✕ 关闭',
  },

  // 数据导出
  export: {
    noData: '暂无日程数据可导出',
    exportFailed: '导出失败',
    title: '小舒日程导出',
  },

  // 日程方案
  scheduleSet: {
    title: '日程方案',
    saveCurrent: '保存当前方案',
    saveHint: '将当前日程保存为方案以便切换',
    switchSet: '切换方案',
    manage: '管理方案',
    manageHint: '查看/删除已保存的方案',
    noSets: '暂无已保存的日程方案',
    selectTip: '点击方案名称以加载',
    enterName: '请输入方案名称（如"备考方案"）',
    saved: '方案"{name}"已保存',
    switched: '已切换到方案"{name}"',
    deleted: '方案"{name}"已删除',
  },

  // 拖延分析
  delay: {
    title: '拖延分析',
    noData: '今日暂无任务数据',
    delayRate: '拖延率',
    skippedTasks: '跳过任务：{count} 个',
    delayedTasks: '延迟完成：{count} 个',
    onTimeTasks: '按时完成：{count} 个',
    warning: '⚠ 今日拖延率较高，建议优先完成重要任务',
    improve: '💪 还有改进空间，继续加油',
    perfect: '🎉 完美！所有任务按时完成',
    good: '👍 表现不错，保持节奏',
  },

  // 导入预览编辑
  importEdit: {
    datePlaceholder: '日期 YYYY-MM-DD',
    startPlaceholder: '开始',
    endPlaceholder: '结束',
    phasePlaceholder: '阶段',
    titlePlaceholder: '任务标题',
    contentPlaceholder: '具体内容（可选）',
    deleteItem: '确定要删除"{title}"吗？',
    existingInfo: '当前已有 {count} 个日程事件，导入将合并新日程（相同日期+时间的任务会更新内容）',
    pasteTextHint: '直接粘贴日程安排文本内容',
    weeklyHeatmap: '每周热力图',
    phaseStats: '阶段统计',
  },

  // 语言
  language: '语言 / Language',

  // 账户
  account: {
    title: '账户',
    deleteAccount: '注销账户',
    deleteAccountDesc: '清除所有数据并重置',
    deleteAccountMsg: '注销将清除您的所有日程数据、设置和操作日志。此操作不可撤销，确定要继续吗？',
    deleteAccountConfirm: '确认注销',
  },

  common: {
    confirm: '确定',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    save: '保存',
    back: '返回',
    close: '关闭',
    retry: '重试',
    loading: '加载中...',
    noData: '暂无数据',
    error: '出错了',
    success: '操作成功',
    warning: '警告',
    info: '提示',
    comingSoon: '即将上线',
    deleteConfirm: '删除确认',
    feedback: '意见反馈',
    feedbackEmail: '请发送邮件至：support@xiaoshuapp.com',
  },
};
