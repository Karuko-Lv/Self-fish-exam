import {
  DEFAULT_EXAM_DATE,
  STORAGE_KEY_BASE,
  defaultTasks,
  seedTopics,
  subjects,
} from "../constants/defaults.js";
import { dateAdd, todayISO } from "./dates.js";

export function localStorageKeyForUser(userId) {
  return `${STORAGE_KEY_BASE}.${userId}`;
}

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeState(input = {}) {
  const topicState = {};
  subjects.forEach((subject) => {
    topicState[subject.id] = (seedTopics[subject.id] || []).map((name, index) => {
      const saved = input.topicState?.[subject.id]?.[index];
      return {
        id: `${subject.id}-${index}`,
        name,
        status: saved?.status || (index === 0 ? "basic" : "empty"),
      };
    });
  });

  const sentenceLogs = Array.isArray(input.sentenceLogs)
    ? input.sentenceLogs
    : Array.isArray(input.wordLogs)
      ? input.wordLogs.map((log) => ({
          id: log.id || uid("sentence"),
          text: log.text || log.word || "",
          source: log.source || "",
          note: log.note || log.meaning || "",
          screenshot: log.screenshot || "",
          date: log.date || todayISO(),
        }))
      : [];

  return {
    examDate: input.examDate || DEFAULT_EXAM_DATE,
    selectedMood: input.selectedMood || "",
    tasks: Array.isArray(input.tasks) && input.tasks.length ? input.tasks : structuredClone(defaultTasks),
    taskDate: input.taskDate || todayISO(),
    topicState,
    practiceLogs: Array.isArray(input.practiceLogs) ? input.practiceLogs : [],
    sentenceLogs,
    focusLogs: Array.isArray(input.focusLogs) ? input.focusLogs : [],
    pomodoroLogs: Array.isArray(input.pomodoroLogs) ? input.pomodoroLogs : [],
    distractionLogs: Array.isArray(input.distractionLogs) ? input.distractionLogs : [],
    mistakes: Array.isArray(input.mistakes) ? input.mistakes : [],
    ideas: Array.isArray(input.ideas) ? input.ideas : [],
    countdownEvents:
      Array.isArray(input.countdownEvents) && input.countdownEvents.length
        ? input.countdownEvents
        : [
            {
              id: "exam-default",
              title: "考研初试",
              date: DEFAULT_EXAM_DATE,
              note: "默认目标日，可在倒数日里继续添加阶段节点。",
            },
            {
              id: "month-default",
              title: "本月复盘",
              date: dateAdd(7),
              note: "检查 408、数一、英一各自最不稳的一个点。",
            },
          ],
    settings: {
      adaptiveFit: Boolean(input.settings?.adaptiveFit),
      ...(input.settings || {}),
    },
  };
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(text) {
  const parsed = JSON.parse(text || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("导入文件必须是 JSON 对象。");
  }
  return normalizeState(parsed);
}
