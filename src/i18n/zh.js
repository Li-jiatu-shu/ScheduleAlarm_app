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
    forceVolume: '强制音量',
    forceVolumeDesc: '静音/振动模式下仍播放铃声',

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
  },
};
