export const phraseDictionary = {
  "整理今日错题": "Review today's mistakes",
  "完成英语阅读复盘": "Complete English reading review",
  "本月复盘": "Monthly review",
  "考研初试": "Postgraduate entrance exam",
  "确认考试时间和考点安排": "Confirm exam time and test center arrangements",
  "检查 408 最不稳的一个点": "Check the weakest 408 topic",
  "检查数一和英一的本周卡点": "Check this week's blockers in Math I and English I",
  "整理本周错题": "Review this week's mistakes",
  "整理错题": "Review mistakes",
  "错题模板": "mistake template",
  "下次更快": "faster next time",
  "数据结构": "Data Structures",
  "计算机组成原理": "Computer Organization",
  "操作系统": "Operating Systems",
  "计算机网络": "Computer Networks",
  "数学一": "Math I",
  "英语一": "English I",
  "非学习": "Non-study",
  "错题": "mistakes",
  "复盘": "review",
  "刷题": "practice problems",
  "长难句": "long sentence",
  "番茄钟": "pomodoro",
  "分心": "distraction",
  "知识点": "knowledge point",
  "周复盘": "weekly review",
  "阅读": "reading",
  "完成": "complete",
  "整理": "review",
  "今日": "today's",
  "本周": "this week's",
  "本月": "monthly",
  "模板": "template",
};

const punctuationMap = {
  "，": ", ",
  "。": ". ",
  "：": ": ",
  "；": "; ",
  "（": " (",
  "）": ") ",
  "、": ", ",
  "？": "? ",
  "！": "! ",
  "“": "\"",
  "”": "\"",
};

function hasChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function normalizeSpaces(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .replace(/\s+([)])/g, "$1")
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function smartCapitalize(text) {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

export function draftEnglishFromChinese(text) {
  const source = String(text || "").trim();
  if (!source) return "";
  if (phraseDictionary[source]) return phraseDictionary[source];
  if (!hasChinese(source)) return source;

  const translated = Object.entries(phraseDictionary)
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((draft, [zh, en]) => draft.replace(new RegExp(escapeRegExp(zh), "g"), ` ${en} `), source)
    .replace(/[，。：；（）！？、“”]/g, (mark) => punctuationMap[mark] || mark);

  return smartCapitalize(normalizeSpaces(translated));
}

export function ensureBilingualText(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const zh = String(value.zh ?? value.en ?? "").trim();
    const enSource = String(value.en ?? "").trim();
    const en = enSource || (hasChinese(zh) ? draftEnglishFromChinese(zh) : zh);
    return { zh, en };
  }

  const text = String(value ?? "").trim();
  if (!text) return { zh: "", en: "" };

  return {
    zh: text,
    en: hasChinese(text) ? draftEnglishFromChinese(text) : text,
  };
}

export function textValue(value, language = "zh") {
  const text = ensureBilingualText(value);
  return language === "en" ? text.en || text.zh : text.zh || text.en;
}

export function setBilingualText(value, language, nextText) {
  const text = ensureBilingualText(value);
  const normalizedLanguage = language === "en" ? "en" : "zh";
  return {
    ...text,
    [normalizedLanguage]: String(nextText ?? "").trim(),
  };
}

export function setChineseSourceText(value, nextText) {
  const current = ensureBilingualText(value);
  const previousDraft = draftEnglishFromChinese(current.zh);
  const zh = String(nextText ?? "").trim();
  const shouldRefreshEnglish = !current.en || current.en === previousDraft;

  return {
    zh,
    en: shouldRefreshEnglish ? draftEnglishFromChinese(zh) : current.en,
  };
}
