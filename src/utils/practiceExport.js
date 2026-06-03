const DEFAULT_RECENT_LIMIT = 12;

function timestamp(log) {
  const raw = log?.createdAt || log?.date || "";
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : 0;
}

export function buildPracticeExportRows(logs, fish, options = {}) {
  const limit = options.limit ?? DEFAULT_RECENT_LIMIT;
  return [...(Array.isArray(logs) ? logs : [])]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .slice(0, limit)
    .map((log) => ({
      日期: log.date,
      科目: fish.subjectName(log.subject),
      题源: fish.tx(log.source),
      总题数: log.total,
      正确数: log.correct,
      分钟: log.minutes,
      刷题记录: fish.tx(log.note),
      题目照片: log.photos || [],
    }));
}
