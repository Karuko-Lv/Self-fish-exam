import {
  DEFAULT_EXAM_DATE,
  STORAGE_KEY_BASE,
  defaultTasks,
  defaultPromptCards,
  seedTopics,
  subjects,
} from "../constants/defaults.js";
import { ensureBilingualText } from "../i18n/userText.js";
import { dateAdd, todayISO } from "./dates.js";

export function localStorageKeyForUser(userId) {
  return `${STORAGE_KEY_BASE}.${userId}`;
}

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCountdownTodos(event) {
  if (Array.isArray(event.todos)) {
    return event.todos
      .map((todo, index) => ({
        id: todo.id || `${event.id || "countdown"}-todo-${index}`,
        text: ensureBilingualText(todo.text),
        done: Boolean(todo.done),
      }))
      .filter((todo) => todo.text.zh || todo.text.en);
  }

  const noteText =
    event.note && typeof event.note === "object"
      ? event.note.zh || event.note.en || ""
      : event.note || "";

  return String(noteText)
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${event.id || "countdown"}-todo-${index}`,
      text: ensureBilingualText(text),
      done: false,
    }));
}

function normalizeCountdownEvents(events) {
  return events.map((event, index) => {
    const id = event.id || `countdown-${index}`;
    return {
      id,
      title: ensureBilingualText(event.title || "未命名节点"),
      date: event.date || DEFAULT_EXAM_DATE,
      note: ensureBilingualText(event.note || ""),
      todos: normalizeCountdownTodos({ ...event, id }),
    };
  });
}

function normalizePromptCards(cards) {
  const source = Array.isArray(cards) && cards.length ? cards : defaultPromptCards;
  return source
    .map((card, index) => ({
      id: card.id || `prompt-${index}`,
      group: card.group || "dashboard",
      text: ensureBilingualText(card.text),
    }))
    .filter((card) => card.text.zh || card.text.en);
}

function normalizeKnowledgeReviews(input) {
  const source = Array.isArray(input.knowledgeReviews)
    ? input.knowledgeReviews
    : Array.isArray(input.mistakes)
      ? input.mistakes
      : [];

  return source.map((item, index) => ({
    id: item.id || `knowledge-review-${index}`,
    subject: item.subject || "ds",
    topic: ensureBilingualText(item.topic || ""),
    cause: item.cause || "概念不清",
    reviewDate: item.reviewDate || todayISO(),
    summary: ensureBilingualText(item.summary || ""),
    reviewed: Boolean(item.reviewed),
    date: item.date || todayISO(),
    createdAt: item.createdAt || new Date().toISOString(),
  }));
}

function normalizeTasks(tasks) {
  return tasks.map((task, index) => ({
    id: task.id || `task-${index}`,
    level: task.level || "base",
    title: ensureBilingualText(task.title || ""),
    subject: task.subject || "ds",
    minutes: Number(task.minutes || 0),
    detail: ensureBilingualText(task.detail || ""),
    done: Boolean(task.done),
  }));
}

function normalizePracticeLogs(logs) {
  return logs.map((log, index) => ({
    id: log.id || `practice-${index}`,
    date: log.date || todayISO(),
    createdAt: log.createdAt || new Date().toISOString(),
    subject: log.subject || "math1",
    source: ensureBilingualText(log.source || ""),
    total: Number(log.total || 0),
    correct: Number(log.correct || 0),
    minutes: Number(log.minutes || 0),
    note: ensureBilingualText(log.note || ""),
  }));
}

function normalizeSentenceLogs(logs) {
  return logs.map((log, index) => ({
    id: log.id || `sentence-${index}`,
    text: ensureBilingualText(log.text || log.word || ""),
    source: ensureBilingualText(log.source || ""),
    note: ensureBilingualText(log.note || log.meaning || ""),
    screenshot: log.screenshot || "",
    date: log.date || todayISO(),
    createdAt: log.createdAt || new Date().toISOString(),
  }));
}

function normalizeFocusLogs(logs) {
  return logs.map((log, index) => ({
    id: log.id || `focus-${index}`,
    date: log.date || todayISO(),
    createdAt: log.createdAt || new Date().toISOString(),
    subject: log.subject || "ds",
    startTime: log.startTime || "",
    endTime: log.endTime || "",
    minutes: Number(log.minutes || 0),
    note: ensureBilingualText(log.note || ""),
  }));
}

function normalizePomodoroLogs(logs) {
  return logs.map((log, index) => ({
    id: log.id || `pomodoro-${index}`,
    date: log.date || todayISO(),
    createdAt: log.createdAt || new Date().toISOString(),
    subject: log.subject || "ds",
    minutes: Number(log.minutes || 0),
    mode: ensureBilingualText(log.mode || "专注"),
    note: ensureBilingualText(log.note || ""),
  }));
}

function normalizeDistractionLogs(logs) {
  return logs.map((log, index) => ({
    id: log.id || `distraction-${index}`,
    date: log.date || todayISO(),
    createdAt: log.createdAt || new Date().toISOString(),
    text: ensureBilingualText(log.text || ""),
    type: log.type || "idea",
    reviewTime: log.reviewTime || "",
    done: Boolean(log.done),
    source: log.source || "",
  }));
}

function normalizeIdeas(ideas) {
  return ideas.map((idea, index) => ({
    id: idea.id || `idea-${index}`,
    date: idea.date || todayISO(),
    createdAt: idea.createdAt || new Date().toISOString(),
    text: ensureBilingualText(idea.text || ""),
    reason: ensureBilingualText(idea.reason || ""),
    parked: idea.parked ?? true,
  }));
}

function normalizeAvatarImage(value) {
  return typeof value === "string" && value.startsWith("data:image/") ? value : "";
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
    ? normalizeSentenceLogs(input.sentenceLogs)
    : Array.isArray(input.wordLogs)
      ? normalizeSentenceLogs(input.wordLogs)
      : [];

  return {
    examDate: input.examDate || DEFAULT_EXAM_DATE,
    selectedMood: input.selectedMood || "",
    tasks: normalizeTasks(Array.isArray(input.tasks) && input.tasks.length ? input.tasks : structuredClone(defaultTasks)),
    taskDate: input.taskDate || todayISO(),
    topicState,
    practiceLogs: Array.isArray(input.practiceLogs) ? normalizePracticeLogs(input.practiceLogs) : [],
    sentenceLogs,
    focusLogs: Array.isArray(input.focusLogs) ? normalizeFocusLogs(input.focusLogs) : [],
    pomodoroLogs: Array.isArray(input.pomodoroLogs) ? normalizePomodoroLogs(input.pomodoroLogs) : [],
    distractionLogs: Array.isArray(input.distractionLogs) ? normalizeDistractionLogs(input.distractionLogs) : [],
    knowledgeReviews: normalizeKnowledgeReviews(input),
    ideas: Array.isArray(input.ideas) ? normalizeIdeas(input.ideas) : [],
    countdownEvents: normalizeCountdownEvents(
      Array.isArray(input.countdownEvents) && input.countdownEvents.length
        ? input.countdownEvents
        : [
            {
              id: "exam-default",
              title: "考研初试",
              date: DEFAULT_EXAM_DATE,
              todos: [{ id: "exam-default-todo-0", text: "确认考试时间和考点安排", done: false }],
            },
            {
              id: "month-default",
              title: "本月复盘",
              date: dateAdd(7),
              todos: [
                { id: "month-default-todo-0", text: "检查 408 最不稳的一个点", done: false },
                { id: "month-default-todo-1", text: "检查数一和英一的本周卡点", done: false },
              ],
            },
          ],
    ),
    promptCards: normalizePromptCards(input.promptCards),
    settings: {
      ...(input.settings || {}),
      avatarImage: normalizeAvatarImage(input.settings?.avatarImage),
      adaptiveFit: Boolean(input.settings?.adaptiveFit),
      language: input.settings?.language === "en" ? "en" : "zh",
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
