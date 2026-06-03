import {
  DEFAULT_EXAM_DATE,
  STORAGE_KEY_BASE,
  defaultDailyCheckins,
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
    frequency: item.frequency || "",
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
    words: Array.isArray(log.words) ? log.words.map((w) => ({ word: w.word || "", note: w.note || "" })) : [],
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
    startTime: log.startTime || "",
    endTime: log.endTime || "",
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

function normalizeExamAnalyses(input) {
  const source = Array.isArray(input) ? input : [];
  return source.map((item, index) => {
    const yearRecords = Array.isArray(item.yearRecords) && item.yearRecords.length
      ? item.yearRecords.map((yr) => ({
          year: yr.year || String(new Date().getFullYear()),
          enrollment: Number(yr.enrollment || 0),
          scoreLine: Number(yr.scoreLine || 0),
          retakeRatio: yr.retakeRatio || null,
          avgScore: yr.avgScore != null ? Number(yr.avgScore) : null,
        }))
      : [{ year: item.year || String(new Date().getFullYear()), enrollment: Number(item.enrollment || 0), scoreLine: Number(item.scoreLine || 0), retakeRatio: item.retakeRatio || null, avgScore: item.avgScore != null ? Number(item.avgScore) : null }];
    return {
      id: item.id || `ea-${index}`,
      university: ensureBilingualText(item.university || ""),
      major: ensureBilingualText(item.major || ""),
      subjects: item.subjects || "",
      note: ensureBilingualText(item.note || ""),
      yearRecords,
      date: item.date || todayISO(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
}

function normalizeExpenses(input) {
  const source = Array.isArray(input) ? input : [];
  return source.map((item, index) => ({
    id: item.id || `exp-${index}`,
    amount: Number(item.amount || 0),
    category: item.category || "other",
    type: item.type === "income" ? "income" : "expense",
    note: ensureBilingualText(item.note || ""),
    date: item.date || todayISO(),
    createdAt: item.createdAt || new Date().toISOString(),
  }));
}

function normalizeInspirations(items) {
  return items.map((item, index) => ({
    id: item.id || `inspiration-${index}`,
    date: item.date || todayISO(),
    createdAt: item.createdAt || new Date().toISOString(),
    title: ensureBilingualText(item.title || ""),
    content: ensureBilingualText(item.content || ""),
    category: item.category || "梦想生活",
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

function normalizeDailyCheckins(input) {
  const source = Array.isArray(input) && input.length ? input : defaultDailyCheckins;
  return source
    .map((item, index) => ({
      id: item.id || `daily-checkin-${index}`,
      createdAt: item.createdAt || new Date().toISOString(),
      title: ensureBilingualText(item.title || ""),
      kind: item.kind === "check" ? "check" : "number",
      target: Number(item.target || 0),
      unit: ensureBilingualText(item.unit || ""),
      active: item.active !== false,
    }))
    .filter((item) => item.title.zh || item.title.en);
}

function normalizeDailyCheckinLogs(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return Object.fromEntries(
    Object.entries(source).map(([date, records]) => {
      const dayRecords = records && typeof records === "object" && !Array.isArray(records) ? records : {};
      return [
        date,
        Object.fromEntries(
          Object.entries(dayRecords).map(([itemId, record]) => [
            itemId,
            {
              itemId,
              date,
              createdAt: record?.createdAt || new Date().toISOString(),
              updatedAt: record?.updatedAt || record?.createdAt || new Date().toISOString(),
              done: Boolean(record?.done),
              value: record?.value == null ? "" : String(record.value),
              note: ensureBilingualText(record?.note || ""),
            },
          ]),
        ),
      ];
    }),
  );
}

function normalizePlanDayCount(value) {
  const count = Math.floor(Number(value || 0));
  if (!Number.isFinite(count)) return 0;
  return Math.min(120, Math.max(0, count));
}

function normalizePagedPlan(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const sourcePages = Array.isArray(source.pages) ? source.pages : [];
  const days = normalizePlanDayCount(source.days == null ? sourcePages.length : source.days);
  const pages = sourcePages.slice(0, days || sourcePages.length).map((page, index) => {
    const day = normalizePlanDayCount(page?.day) || index + 1;
    const todos = Array.isArray(page?.todos)
      ? page.todos
          .map((todo, todoIndex) => ({
            id: todo.id || `${page?.id || `plan-page-${index}`}-todo-${todoIndex}`,
            text: ensureBilingualText(todo.text || ""),
            done: Boolean(todo.done),
          }))
          .filter((todo) => todo.text.zh || todo.text.en)
      : [];
    return {
      id: page?.id || `plan-page-${index}`,
      day,
      title: ensureBilingualText(page?.title || `第 ${day} 天计划`),
      goal: ensureBilingualText(page?.goal || ""),
      tasks: ensureBilingualText(page?.tasks || ""),
      output: ensureBilingualText(page?.output || ""),
      todos,
      done: Boolean(page?.done),
    };
  });

  return {
    days: days || pages.length,
    generatedAt: source.generatedAt || "",
    pages,
  };
}

function normalizeAvatarImage(value) {
  return typeof value === "string" && value.startsWith("data:image/") ? value : "";
}

function normalizeSubjectOutputs(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const outputs = {};
  subjects.forEach((subject) => {
    const subjectSource = source[subject.id];
    outputs[subject.id] = {};
    if (!subjectSource || typeof subjectSource !== "object" || Array.isArray(subjectSource)) return;

    Object.entries(subjectSource).forEach(([branchId, entries]) => {
      outputs[subject.id][branchId] = Array.isArray(entries)
        ? entries
            .map((entry, index) => ({
              id: entry.id || `${subject.id}-${branchId}-output-${index}`,
              date: entry.date || todayISO(),
              createdAt: entry.createdAt || new Date().toISOString(),
              type: entry.type || "concept",
              topicId: typeof entry.topicId === "string" ? entry.topicId : "",
              note: ensureBilingualText(entry.note || ""),
            }))
            .filter((entry) => entry.note.zh || entry.note.en)
        : [];
    });
  });
  return outputs;
}

function normalizeCustomBranches(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const result = {};
  subjects.forEach((s) => {
    const arr = Array.isArray(source[s.id]) ? source[s.id] : [];
    result[s.id] = arr
      .map((b, i) => ({
        id: b.id || `custom-branch-${s.id}-${i}`,
        label: ensureBilingualText(b.label || ""),
        topics: Array.isArray(b.topics) ? b.topics.filter((tid) => typeof tid === "string") : [],
      }))
      .filter((b) => b.label.zh || b.label.en);
  });
  return result;
}

export function normalizeState(input = {}) {
  const topicState = {};
  subjects.forEach((subject) => {
    const seeds = seedTopics[subject.id] || [];
    const savedArr = Array.isArray(input.topicState?.[subject.id])
      ? input.topicState[subject.id]
      : [];

    // Build seed topics by index (backward-compatible)
    const topics = seeds.map((name, index) => {
      const saved = savedArr[index];
      const reviewLog = Array.isArray(saved?.reviewLog)
        ? saved.reviewLog.map((entry, ri) => ({
            id: entry.id || `${subject.id}-${index}-review-${ri}`,
            date: entry.date || todayISO(),
            createdAt: entry.createdAt || new Date().toISOString(),
            note: ensureBilingualText(entry.note || ""),
            errorCauses: Array.isArray(entry.errorCauses) ? entry.errorCauses : [],
            questionTypes: Array.isArray(entry.questionTypes) ? entry.questionTypes : [],
            result: entry.result || "",
          }))
        : [];
      return {
        id: `${subject.id}-${index}`,
        name,
        status: saved?.status || (index === 0 ? "basic" : "empty"),
        reviewLog,
      };
    });

    // Preserve custom topics (beyond seed count) from saved data
    for (let i = seeds.length; i < savedArr.length; i++) {
      const saved = savedArr[i];
      if (!saved || !saved.name) continue;
      const reviewLog = Array.isArray(saved.reviewLog)
        ? saved.reviewLog.map((entry, ri) => ({
            id: entry.id || `${(saved.id || "custom")}-review-${ri}`,
            date: entry.date || todayISO(),
            createdAt: entry.createdAt || new Date().toISOString(),
            note: ensureBilingualText(entry.note || ""),
            errorCauses: Array.isArray(entry.errorCauses) ? entry.errorCauses : [],
            questionTypes: Array.isArray(entry.questionTypes) ? entry.questionTypes : [],
            result: entry.result || "",
          }))
        : [];
      topics.push({
        id: saved.id || uid("topic"),
        name: saved.name,
        status: saved.status || "empty",
        branchId: typeof saved.branchId === "string" ? saved.branchId : undefined,
        parentId: typeof saved.parentId === "string" ? saved.parentId : undefined,
        reviewLog,
      });
    }

    topicState[subject.id] = topics;
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
    customBranches: normalizeCustomBranches(input.customBranches),
    subjectOutputs: normalizeSubjectOutputs(input.subjectOutputs),
    practiceLogs: Array.isArray(input.practiceLogs) ? normalizePracticeLogs(input.practiceLogs) : [],
    sentenceLogs,
    focusLogs: Array.isArray(input.focusLogs) ? normalizeFocusLogs(input.focusLogs) : [],
    pomodoroLogs: Array.isArray(input.pomodoroLogs) ? normalizePomodoroLogs(input.pomodoroLogs) : [],
    distractionLogs: Array.isArray(input.distractionLogs) ? normalizeDistractionLogs(input.distractionLogs) : [],
    knowledgeReviews: normalizeKnowledgeReviews(input),
    examAnalyses: normalizeExamAnalyses(input.examAnalyses),
    expenses: normalizeExpenses(input.expenses),
    ideas: Array.isArray(input.ideas) ? normalizeIdeas(input.ideas) : [],
    inspirations: Array.isArray(input.inspirations) ? normalizeInspirations(input.inspirations) : [],
    dailyCheckins: normalizeDailyCheckins(input.dailyCheckins),
    dailyCheckinLogs: normalizeDailyCheckinLogs(input.dailyCheckinLogs),
    pagedPlan: normalizePagedPlan(input.pagedPlan),
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
