/**
 * 日程文件解析器
 *
 * 解析 Markdown/文本格式的日程安排文件，
 * 提取阶段信息、日期范围和每日时间表，
 * 生成标准化的 ScheduleEvent 数组。
 */

import { generateUUID, getDateRange, formatDate } from '../../utils/helpers';
import { TABLE_HEADERS } from '../../utils/constants';

/**
 * @typedef {Object} ParseError
 * @property {number} line - 错误所在行号
 * @property {string} message - 错误描述
 */

/**
 * @typedef {Object} PhaseInfo
 * @property {string} name - 阶段名称
 * @property {string} keyword - 阶段关键词（基础/强化/冲刺）
 * @property {string} startDate - 开始日期 YYYY-MM-DD
 * @property {string} endDate - 结束日期 YYYY-MM-DD
 */

/**
 * @typedef {Object} ScheduleEvent
 * @property {string} id - UUID
 * @property {string} phase - 阶段名称
 * @property {string} date - 日期 YYYY-MM-DD
 * @property {string} startTime - 开始时间 HH:mm
 * @property {string|null} endTime - 结束时间 HH:mm
 * @property {string} title - 任务标题
 * @property {string} content - 具体内容
 * @property {boolean} repeat - 是否每日重复
 * @property {boolean} enabled - 是否启用
 */

/**
 * @typedef {Object} ParseResult
 * @property {ScheduleEvent[]} events - 解析出的事件列表
 * @property {ParseError[]} errors - 解析错误列表
 * @property {PhaseInfo[]} phases - 识别到的阶段列表
 */

// ---- 正则表达式 ----

/** 匹配阶段标题行：### 或 ** 开头，含"阶段"关键词 */
const PHASE_HEADER_RE = /^(?:#{1,3}\s+|[*_]{2,})(.*?阶段.*?)(?:[*_]{2,})?$/;

/** 匹配阶段日期范围：7月27日 - 9月15日 */
const DATE_RANGE_RE = /(\d{1,4}年)?\s*(\d{1,2})月(\d{1,2})日\s*[-–—至到]\s*(\d{1,4}年)?\s*(\d{1,2})月(\d{1,2})日/;

/** 匹配阶段起止日期（单日格式）：7月27日起 */
const SINGLE_DATE_RE = /(\d{1,4}年)?\s*(\d{1,2})月(\d{1,2})日\s*起/;

/** 识别表格行（以 | 开头和结尾） */
const TABLE_ROW_RE = /^\|.+\|$/;

/** 表格分隔行（|---|---|） */
const TABLE_SEPARATOR_RE = /^\|[\s:-]+\|[\s:-]+\|[\s:-]+\|$/;

/** 时间格式 HH:MM - HH:MM 或 HH:MM */
const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*[-–—至到]\s*(\d{1,2}):(\d{2})/;
const SINGLE_TIME_RE = /(\d{1,2}):(\d{2})/;

/** 阶段关键词匹配 */
const STAGE_KEYWORD_RE = /(基础|强化|冲刺)/;

/** 阶段名称提取：如 "1. 基础阶段每日作息" → "基础阶段" */
const STAGE_NAME_RE = /(基础阶段|强化阶段|冲刺阶段)/;

// ---- 解析器主函数 ----

/**
 * 解析日程文本，返回事件列表和错误信息
 * @param {string} text - 日程安排文本
 * @param {number} [defaultYear=2026] - 默认年份
 * @returns {ParseResult}
 */
export function parseSchedule(text, defaultYear = 2026) {
  const errors = [];
  const phases = [];
  const events = [];

  if (!text || !text.trim()) {
    errors.push({ line: 0, message: '输入文本为空' });
    return { events, errors, phases };
  }

  const lines = text.split('\n').map((l) => l.trim());

  // 第一步：识别所有阶段和日期范围
  let currentPhase = null;
  let currentDateRange = null; // { start, end }
  const phaseDateRanges = []; // [{ phaseName, startDate, endDate }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过空行
    if (!line) continue;

    // 检测阶段标题
    if (PHASE_HEADER_RE.test(line)) {
      const phaseName = extractPhaseName(line);
      if (phaseName) {
        currentPhase = phaseName;
      }
      continue;
    }

    // 检测日期范围（优先当前阶段）
    const dateMatch = line.match(DATE_RANGE_RE);
    if (dateMatch) {
      const startDate = buildDate(dateMatch, 1, 2, 3, defaultYear);
      const endDate = buildDate(dateMatch, 4, 5, 6, defaultYear);

      if (startDate && endDate) {
        currentDateRange = {
          start: formatDate(startDate),
          end: formatDate(endDate),
        };

        // 尝试关联到最近的阶段
        if (currentPhase) {
          const keyword = extractStageKeyword(line);
          const phaseObj = {
            name: currentPhase,
            keyword: keyword || currentPhase,
            startDate: currentDateRange.start,
            endDate: currentDateRange.end,
          };
          phases.push(phaseObj);
          phaseDateRanges.push({
            phaseName: currentPhase,
            startDate: currentDateRange.start,
            endDate: currentDateRange.end,
          });
        }
      } else {
        errors.push({ line: i + 1, message: `无法解析日期格式：${line}` });
      }
      continue;
    }

    // 检测单日日期（"X月X日起"）
    const singleDateMatch = line.match(SINGLE_DATE_RE);
    if (singleDateMatch && currentPhase) {
      const startDate = buildSingleDate(singleDateMatch, defaultYear);
      if (startDate) {
        const startDateStr = formatDate(startDate);
        // 默认结束日期设为同一年底
        const endDate = new Date(defaultYear, 11, 31);
        const endDateStr = formatDate(endDate);

        phases.push({
          name: currentPhase,
          keyword: extractStageKeyword(line) || currentPhase,
          startDate: startDateStr,
          endDate: endDateStr,
        });
        phaseDateRanges.push({
          phaseName: currentPhase,
          startDate: startDateStr,
          endDate: endDateStr,
        });
      }
      continue;
    }
  }

  // 第二步：解析表格，生成事件
  let inTable = false;
  let tablePhase = null;
  let tableDateRange = null;
  let tableHeaderIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跟踪当前所属的阶段
    if (PHASE_HEADER_RE.test(line)) {
      const phaseName = extractPhaseName(line);
      if (phaseName) {
        // 查找此阶段对应的日期范围
        const range = phaseDateRanges.find((r) => r.phaseName === phaseName);
        tablePhase = phaseName;
        tableDateRange = range || null;
      }
      inTable = false;
      continue;
    }

    // 检测表格开始（表头行）
    if (TABLE_ROW_RE.test(line) && !TABLE_SEPARATOR_RE.test(line)) {
      const cells = parseTableRow(line);
      if (isTableHeader(cells)) {
        inTable = true;
        tableHeaderIndex = i;
        continue;
      }
    }

    // 跳过表格分隔行
    if (TABLE_SEPARATOR_RE.test(line) && inTable) {
      continue;
    }

    // 解析表格数据行
    if (inTable && TABLE_ROW_RE.test(line)) {
      const cells = parseTableRow(line);
      if (cells.length >= 2 && cells[0]) {
        const event = parseTableEvent(cells, tablePhase, tableDateRange, i + 1);

        if (event) {
          // 检查是否为每日重复（属于阶段内每一天）
          if (tableDateRange) {
            const dates = getDateRange(
              new Date(tableDateRange.startDate),
              new Date(tableDateRange.endDate)
            );
            for (const date of dates) {
              events.push({
                ...event,
                id: generateUUID(),
                date,
                repeat: dates.length > 1,
              });
            }
          } else {
            // 没有日期范围，标记为需要手动设置日期
            events.push({
              ...event,
              id: generateUUID(),
              repeat: false,
            });
            errors.push({
              line: i + 1,
              message: `无法确定事件"${event.title}"的日期范围，使用默认日期`,
            });
          }
        } else if (cells[0] && cells[1]) {
          errors.push({
            line: i + 1,
            message: `无法解析表格行：${line}`,
          });
        }
      }
    }

    // 表格结束（遇到非表格行且非空行）
    if (inTable && !TABLE_ROW_RE.test(line) && line.trim()) {
      inTable = false;
      tableHeaderIndex = -1;
    }
  }

  // 去重（同一个日期+时间+任务标题）
  const uniqueEvents = deduplicateEvents(events);

  return { events: uniqueEvents, errors, phases };
}

// ---- 内部辅助函数 ----

/**
 * 从行文本中提取阶段名称
 */
function extractPhaseName(line) {
  // 匹配 "基础阶段"、"强化阶段"、"冲刺阶段"
  const match = line.match(STAGE_NAME_RE);
  if (match) return match[1];

  // 如果行中有"阶段"关键词，提取前面的修饰词
  const stageMatch = line.match(STAGE_KEYWORD_RE);
  if (stageMatch) {
    return stageMatch[1] + '阶段';
  }

  return null;
}

/**
 * 提取阶段关键词
 */
function extractStageKeyword(line) {
  const match = line.match(STAGE_KEYWORD_RE);
  return match ? match[1] : null;
}

/**
 * 从正则匹配中构建 Date 对象
 */
function buildDate(match, yearGroup, monthGroup, dayGroup, defaultYear) {
  const year = match[yearGroup]
    ? parseInt(match[yearGroup].replace('年', ''))
    : defaultYear;
  const month = parseInt(match[monthGroup]);
  const day = parseInt(match[dayGroup]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return new Date(year, month - 1, day);
}

/**
 * 从单日日期构建 Date 对象
 */
function buildSingleDate(match, defaultYear) {
  const year = match[1] ? parseInt(match[1].replace('年', '')) : defaultYear;
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);
  return new Date(year, month - 1, day);
}

/**
 * 判断是否为表格表头行
 */
function isTableHeader(cells) {
  if (cells.length < 2) return false;
  // 检查是否包含"时间"、"任务"等关键词
  const headerChecks = TABLE_HEADERS.map((h) =>
    cells.some((c) => c.includes(h))
  );
  return headerChecks.filter(Boolean).length >= 2;
}

/**
 * 解析表格行，返回单元格数组
 */
function parseTableRow(line) {
  // 去掉首尾的 |
  const trimmed = line.replace(/^\||\|$/g, '');
  // 按 | 分割
  return trimmed.split('|').map((c) => c.trim());
}

/**
 * 解析表格事件行
 * @param {string[]} cells - 表格单元格
 * @param {string|null} phase - 当前阶段名称
 * @param {{phaseName,startDate,endDate}|null} dateRange
 * @param {number} lineNumber
 * @returns {ScheduleEvent|null}
 */
function parseTableEvent(cells, phase, dateRange, lineNumber) {
  const timeCell = cells[0] || '';
  const title = cells[1] || '';
  const content = cells[2] || '';

  if (!timeCell || !title) return null;

  // 解析时间：HH:MM - HH:MM 或 HH:MM
  let startTime = '';
  let endTime = null;

  const timeRangeMatch = timeCell.match(TIME_RANGE_RE);
  if (timeRangeMatch) {
    startTime = `${timeRangeMatch[1].padStart(2, '0')}:${timeRangeMatch[2]}`;
    endTime = `${timeRangeMatch[3].padStart(2, '0')}:${timeRangeMatch[4]}`;
  } else {
    const singleTimeMatch = timeCell.match(SINGLE_TIME_RE);
    if (singleTimeMatch) {
      startTime = `${singleTimeMatch[1].padStart(2, '0')}:${singleTimeMatch[2]}`;
    } else {
      return null; // 无法识别时间格式
    }
  }

  // 清理标题（去掉 ** 标记）
  const cleanTitle = title.replace(/[*_]{2,}/g, '').trim();

  // 清理内容
  const cleanContent = content.replace(/<br\s*\/?>/gi, '\n').trim();

  return {
    id: generateUUID(), // 临时 ID，会在日期展开时替换
    phase: phase || '未分类',
    date: dateRange ? dateRange.startDate : formatDate(new Date()), // 默认今天
    start_time: startTime,
    end_time: endTime,
    title: cleanTitle,
    content: cleanContent,
    repeat: false,
    enabled: 1,
    completed: 0,
    completed_at: null,
  };
}

/**
 * 事件去重：相同日期+开始时间+标题的事件保留一个
 */
function deduplicateEvents(events) {
  const seen = new Map();
  const result = [];

  for (const event of events) {
    const key = `${event.date}_${event.startTime}_${event.title}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(event);
    }
  }

  return result;
}

// ---- 导出辅助函数用于测试 ----

export const __test__ = {
  extractPhaseName,
  extractStageKeyword,
  buildDate,
  parseTableRow,
  isTableHeader,
  parseTableEvent,
};
