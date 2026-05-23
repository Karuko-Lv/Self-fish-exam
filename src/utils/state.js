import {
  DEFAULT_EXAM_DATE,
  STORAGE_KEY_BASE,
  defaultTasks,
  defaultPromptCards,
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

function normalizeCountdownTodos(event) {
  if (Array.isArray(event.todos)) {
    return event.todos
      .map((todo, index) => ({
        id: todo.id || `${event.id || "countdown"}-todo-${index}`,
        text: String(todo.text || "").trim(),
        done: Boolean(todo.done),
      }))
      .filter((todo) => todo.text);
  }

  return String(event.note || "")
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${event.id || "countdown"}-todo-${index}`,
      text,
      done: false,
    }));
}

function normalizeCountdownEvents(events) {
  return events.map((event, index) => {
    const id = event.id || `countdown-${index}`;
    return {
      id,
      title: event.title || "未命名节点",
      date: event.date || DEFAULT_EXAM_DATE,
      note: event.note || "",
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
      text: String(card.text || "").trim(),
    }))
    .filter((card) => card.text);
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
