/**
 * 时间相关工具：格式化耗时与时间戳。
 * 供 Stage1/Stage2/Stage3 与 ChatInterface 复用。
 */

/**
 * 将秒数格式化为可读字符串。
 * @param {number} seconds - 秒数
 * @returns {string|null} 格式化后的耗时，或无效时返回 null
 */
export function formatDuration(seconds) {
  if (!seconds) return null;
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}毫秒`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}分 ${secs}秒`;
}

/**
 * 将 Unix 时间戳格式化为时间字符串（HH:mm:ss.S）。
 * @param {number} timestamp - Unix 时间戳（秒）
 * @returns {string|null} 格式化后的时间，或无效时返回 null
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  // 24 小时制：HH:mm:ss.S
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(Math.floor(date.getMilliseconds() / 100)).padStart(1, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 将 ISO 日期字符串格式化为相对时间（今天、昨天等）。
 * @param {string} isoString - ISO 日期字符串（如 "2026-01-02T10:30:00"）
 * @returns {string} 相对日期字符串
 */
export function formatRelativeDate(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();

  // 归零时间部分用于日期对比
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.floor((today - dateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // 今天：显示时间
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    // 本周：显示星期
    return date.toLocaleDateString('zh-CN', { weekday: 'short' });
  } else if (date.getFullYear() === now.getFullYear()) {
    // 当年：显示月日
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } else {
    // 更早：显示完整日期
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
