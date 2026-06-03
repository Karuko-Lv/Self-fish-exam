import { computed, reactive, ref, shallowRef, watch } from "vue";
import { timerSubjects } from "../constants/defaults.js";
import { translateMessage } from "../i18n/messages.js";
import { ensureBilingualText, setBilingualText, setChineseSourceText, textValue } from "../i18n/userText.js";
import { daysUntil, startOfWeek, studyDayISO, todayISO } from "../utils/dates.js";
import { localStorageKeyForUser, normalizeState, uid } from "../utils/state.js";

const bilingualFieldsByCollection = {
  tasks: ["title", "detail"],
  countdownEvents: ["title", "note"],
  practiceLogs: ["source", "note"],
  sentenceLogs: ["text", "source", "note"],
  focusLogs: ["note"],
  pomodoroLogs: ["mode", "note"],
  distractionLogs: ["text"],
  knowledgeReviews: ["topic", "summary"],
  examAnalyses: ["university", "major", "note"],
  expenses: ["note"],
  ideas: ["text", "reason"],
  inspirations: ["title", "content"],
  dailyCheckins: ["title", "unit"],
};

function withBilingualFields(payload, fields) {
  const nextPayload = { ...payload };
  fields.forEach((field) => {
    if (field in nextPayload) nextPayload[field] = setChineseSourceText(undefined, nextPayload[field]);
  });
  return nextPayload;
}

export function useSelfFishState(user, showToast) {
  const state = reactive(normalizeState({}));
  const activeTimer = shallowRef(null);
  const loaded = ref(false);
  const syncStatus = ref("等待登录");
  let saveTimer = null;
  let suppressSave = false;

  const today = computed(() => todayISO());
  const daysLeft = computed(() => daysUntil(state.examDate));
  const language = computed(() => state.settings.language || "zh");
  const isEnglish = computed(() => language.value === "en");

  function replaceState(nextState) {
    suppressSave = true;
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, normalizeState(nextState));
    suppressSave = false;
  }

  function loadLocal() {
    if (!user.value) return;
    const raw = localStorage.getItem(localStorageKeyForUser(user.value.id));
    if (!raw) {
      replaceState({});
      return;
    }
    try {
      replaceState(JSON.parse(raw));
    } catch {
      replaceState({});
    }
  }

  async function loadServer() {
    if (!user.value) return;
    syncStatus.value = "同步中";
    try {
      const response = await fetch("/api/state", { credentials: "same-origin" });
      if (response.status === 401) {
        syncStatus.value = "需要重新登录";
        return;
      }
      const payload = await response.json();
      if (response.ok && payload && Object.keys(payload).length) {
        replaceState(payload);
      }
      syncStatus.value = "已同步";
    } catch {
      syncStatus.value = "本地模式";
      showToast?.("云端暂时不可用，已保留本地缓存。");
    } finally {
      loaded.value = true;
    }
  }

  async function initialize() {
    loaded.value = false;
    loadLocal();
    await loadServer();
    loaded.value = true;
  }

  function saveLocal() {
    if (!user.value) return;
    localStorage.setItem(localStorageKeyForUser(user.value.id), JSON.stringify(state));
  }

  async function saveServer() {
    if (!user.value) return;
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(state),
      });
      syncStatus.value = response.ok ? "已同步" : "同步失败";
    } catch {
      syncStatus.value = "本地模式";
    }
  }

  watch(
    activeTimer,
    (val) => {
      if (!user.value) return;
      const key = localStorageKeyForUser(user.value.id) + '.activeTimer';
      if (val) {
        localStorage.setItem(key, JSON.stringify(val));
      } else {
        localStorage.removeItem(key);
      }
    },
  );

  watch(
    state,
    () => {
      if (suppressSave || !loaded.value || !user.value) return;
      saveLocal();
      syncStatus.value = "待同步";
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(saveServer, 500);
    },
    { deep: true },
  );

  function setLanguage(nextLanguage) {
    state.settings.language = nextLanguage === "en" ? "en" : "zh";
  }

  function notify(message) {
    if (message) showToast?.(message);
  }

  function setAvatarImage(value) {
    const nextValue = typeof value === "string" && value.startsWith("data:image/") ? value : "";
    state.settings.avatarImage = nextValue;
    showToast?.(t(nextValue ? "头像已更新。" : "头像已恢复默认。"));
  }

  function t(message, params) {
    return translateMessage(message, language.value, params);
  }

  function tx(value) {
    return textValue(value, language.value);
  }

  function textSource(value) {
    return textValue(value, "zh");
  }

  function renderBold(value) {
    const text = typeof value === 'string' ? value : tx(value);
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function subjectName(id) {
    const subject = timerSubjects.find((item) => item.id === id);
    return subject ? t(subject.name) : id;
  }

  function resetDailyTasks() {
    state.tasks.forEach((task) => {
      task.done = false;
    });
    state.taskDate = today.value;
  }

  function maybeResetDailyTasks() {
    if (state.taskDate !== today.value) resetDailyTasks();
  }

  function setExamDate(value) {
    state.examDate = value;
  }

  function selectMood(id) {
    state.selectedMood = id;
  }

  function findWeakSubject() {
    const topic = Object.values(state.topicState)
      .flat()
      .find((item) => {
        const health = deriveHealth(item);
        return health === "wrong" || health === "fragile";
      });
    return topic?.id?.split("-")[0] || "ds";
  }

  function applyMoodTasks() {
    const weakSubject = findWeakSubject();
    const profiles = {
      clear: {
        base: ["热身保底", 25, "先复盘 1 道错题，让今天进入状态。"],
        standard: ["主线推进", 90, "挑一个薄弱点，看讲义后做 8 道题。"],
        burst: ["高压复盘", 150, "整理近 7 天错因，找出最该修的一类。"],
      },
      anxious: {
        base: ["落地保底", 20, "只做一道题，从题干里圈关键条件。"],
        standard: ["低速主线", 50, "看 20 分钟讲义，再做 5 道基础题。"],
        burst: ["稳定加码", 90, "完成一组错题二刷，不追求速度。"],
      },
      slump: {
        base: ["桌面重启", 15, "整理学习区 5 分钟，再看一道旧题。"],
        standard: ["只背一张卡", 30, "选一个概念，用自己的话写 3 句。"],
        burst: ["轻量回主线", 60, "画一张小框架，把不稳点圈出来。"],
      },
      excited: {
        base: ["先接主线", 25, "完成一个 408 小点，再处理灵感。"],
        standard: ["热度推进", 90, "把兴奋接到一节主线和一组题上。"],
        burst: ["冲刺训练", 120, "计时训练，结束后只记录三个错因。"],
      },
      tired: {
        base: ["轻复盘", 20, "看 3 道错题，说出为什么错。"],
        standard: ["框架补洞", 45, "画一张科目小地图，把不稳点标出来。"],
        burst: ["慢速整合", 80, "只做一类题，避免跨科跳来跳去。"],
      },
      lost: {
        base: ["找下一步", 20, "打开全科进度，选一个“错多”点做 20 分钟。"],
        standard: ["单点突破", 60, "只抓一个知识点，不跨科，不扩展。"],
        burst: ["复盘收束", 100, "把今天最模糊的点整理成一页笔记。"],
      },
    };
    const profile = profiles[state.selectedMood] || profiles.anxious;
    const generated = Object.entries(profile).map(([level, [title, minutes, detail]]) => ({
      id: uid("task"),
      level,
      title: setChineseSourceText(undefined, title),
      subject: weakSubject,
      minutes,
      detail: setChineseSourceText(undefined, detail),
      done: false,
    }));
    state.tasks = [...generated, ...state.tasks].slice(0, 9);
    showToast?.("已按当前状态生成任务。");
  }

  function toggleTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (task) task.done = !task.done;
  }

  function addFocusLog(payload) {
    const minutes = payload.minutes ?? minutesBetween(payload.startTime, payload.endTime);
    state.focusLogs.unshift({
      id: uid("focus"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...withBilingualFields(payload, bilingualFieldsByCollection.focusLogs),
      minutes,
    });
  }

  function deleteById(collection, id) {
    state[collection] = state[collection].filter((item) => item.id !== id);
  }

  function updateById(collection, id, patch) {
    const item = state[collection]?.find((entry) => entry.id === id);
    if (!item) return;
    const fields = bilingualFieldsByCollection[collection] || [];
    const nextPatch = { ...patch };
    fields.forEach((field) => {
      if (field in nextPatch) nextPatch[field] = setChineseSourceText(item[field], nextPatch[field]);
    });
    Object.assign(item, nextPatch);
  }

  function updateTranslation(collection, id, field, nextText) {
    const item = state[collection]?.find((entry) => entry.id === id);
    if (!item) return;
    item[field] = setBilingualText(item[field], "en", nextText);
  }

  function minutesBetween(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 24 * 60;
    return Math.max(0, minutes);
  }

  function addCountdown(payload) {
    const id = uid("countdown");
    state.countdownEvents.push({
      id,
      ...payload,
      title: setChineseSourceText(undefined, payload.title),
      note: setChineseSourceText(undefined, payload.note || ""),
      todos: (payload.todos || []).map((todo, index) => ({
        id: todo.id || `${id}-todo-${index}`,
        text: setChineseSourceText(undefined, todo.text),
        done: Boolean(todo.done),
      })),
    });
  }

  function toggleCountdownTodo(eventId, todoId) {
    const event = state.countdownEvents.find((item) => item.id === eventId);
    const todo = event?.todos?.find((item) => item.id === todoId);
    if (todo) todo.done = !todo.done;
  }

  function updateCountdown(eventId, patch) {
    const nextPatch = { ...patch };
    if ("title" in nextPatch) nextPatch.title = patch.title;
    if ("note" in nextPatch) nextPatch.note = patch.note;
    if (Array.isArray(nextPatch.todos)) {
      nextPatch.todos = nextPatch.todos.map((todo) => ({
        ...todo,
        text: ensureBilingualText(todo.text),
      }));
    }
    updateById("countdownEvents", eventId, nextPatch);
  }

  function updateCountdownTodoTranslation(eventId, todoId, nextText) {
    const event = state.countdownEvents.find((item) => item.id === eventId);
    const todo = event?.todos?.find((item) => item.id === todoId);
    if (todo) todo.text = setBilingualText(todo.text, "en", nextText);
  }

  function addTopic(subjectId, name, branchId, parentId) {
    if (!state.topicState[subjectId]) state.topicState[subjectId] = [];
    const id = uid("topic");
    state.topicState[subjectId].push({
      id,
      name,
      status: "empty",
      branchId: branchId || undefined,
      parentId: parentId || undefined,
      reviewLog: [],
    });
    const branch = state.customBranches[subjectId]?.find((item) => item.id === branchId);
    if (branch && !branch.topics.includes(id)) branch.topics.push(id);
    return id;
  }

  function addBranch(subjectId, label) {
    if (!state.customBranches[subjectId]) state.customBranches[subjectId] = [];
    const id = uid("branch");
    state.customBranches[subjectId].push({
      id,
      label: ensureBilingualText(label),
      topics: [],
    });
    return id;
  }

  function deleteTopic(subjectId, topicId) {
    const arr = state.topicState[subjectId];
    if (!arr) return;
    // Only allow deletion of custom topics (uid-based IDs, not index-based seed topics)
    if (!topicId.startsWith("topic-")) return;
    state.topicState[subjectId] = arr.filter((t) => t.id !== topicId);
    // Also remove from any custom branch's topics array
    const branches = state.customBranches[subjectId];
    if (Array.isArray(branches)) {
      branches.forEach((b) => {
        b.topics = b.topics.filter((tid) => tid !== topicId);
      });
    }
  }

  function deleteBranch(subjectId, branchId) {
    const branches = state.customBranches[subjectId];
    if (!Array.isArray(branches)) return;
    state.customBranches[subjectId] = branches.filter((b) => b.id !== branchId);
  }

  function updateTopicStatus(subjectId, topicId, status) {
    const topic = state.topicState[subjectId]?.find((item) => item.id === topicId);
    if (topic) topic.status = status;
  }

  function deriveHealth(topic) {
    const log = topic.reviewLog;
    if (!log || !log.length) {
      return topic.status === 'mastered' || topic.status === 'review' ? 'fragile' : topic.status || 'empty';
    }
    const sorted = [...log].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    const latest = sorted[0];
    const daysSince = Math.floor((Date.now() - new Date(latest.createdAt || latest.date)) / 86400000);

    if (latest.result === 'mastered') {
      if (daysSince <= 7) return 'mastered';
      if (daysSince <= 21) return 'review';
      return 'fragile';
    }
    if (latest.result === 'improving') {
      if (daysSince <= 14) return 'basic';
      if (daysSince <= 30) return 'fragile';
      return 'empty';
    }
    if (latest.result === 'struggling') {
      if (daysSince <= 7) return 'wrong';
      return 'fragile';
    }
    return topic.status || 'empty';
  }

  function addReviewRecord(subjectId, topicId, payload) {
    const topic = state.topicState[subjectId]?.find((item) => item.id === topicId);
    if (!topic) return;
    if (!Array.isArray(topic.reviewLog)) topic.reviewLog = [];
    const record = {
      id: uid('review'),
      date: today.value,
      createdAt: new Date().toISOString(),
      note: ensureBilingualText(payload.note || ''),
      errorCauses: Array.isArray(payload.errorCauses) ? payload.errorCauses : [],
      questionTypes: Array.isArray(payload.questionTypes) ? payload.questionTypes : [],
      result: payload.result || 'improving',
    };
    topic.reviewLog.unshift(record);
    topic.status = deriveHealth(topic);
    return record;
  }

  function deleteReviewRecord(subjectId, topicId, reviewId) {
    const topic = state.topicState[subjectId]?.find((item) => item.id === topicId);
    if (!topic || !Array.isArray(topic.reviewLog)) return;
    topic.reviewLog = topic.reviewLog.filter((r) => r.id !== reviewId);
    topic.status = deriveHealth(topic);
  }

  function addSubjectOutputRecord(subjectId, branchId, payload) {
    if (!state.subjectOutputs[subjectId]) state.subjectOutputs[subjectId] = {};
    if (!Array.isArray(state.subjectOutputs[subjectId][branchId])) state.subjectOutputs[subjectId][branchId] = [];
    const record = {
      id: uid("output"),
      date: today.value,
      createdAt: new Date().toISOString(),
      type: payload.type || "concept",
      topicId: payload.topicId || "",
      note: ensureBilingualText(payload.note || ""),
    };
    state.subjectOutputs[subjectId][branchId].unshift(record);
    return record;
  }

  function deleteSubjectOutputRecord(subjectId, branchId, outputId) {
    const records = state.subjectOutputs[subjectId]?.[branchId];
    if (!Array.isArray(records)) return;
    state.subjectOutputs[subjectId][branchId] = records.filter((record) => record.id !== outputId);
  }

  function addPracticeLog(payload) {
    state.practiceLogs.unshift({
      id: uid("practice"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...withBilingualFields(payload, bilingualFieldsByCollection.practiceLogs),
    });
  }

  function addSentenceLog(payload) {
    state.sentenceLogs.unshift({
      id: uid("sentence"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...withBilingualFields(payload, bilingualFieldsByCollection.sentenceLogs),
    });
  }

  function saveActiveTimer(snapshot) {
    activeTimer.value = { ...snapshot };
  }

  function clearActiveTimer() {
    activeTimer.value = null;
  }

  function getActiveTimer() {
    if (!user.value) return null;
    const key = localStorageKeyForUser(user.value.id) + '.activeTimer';
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function addPomodoroLog(payload) {
    state.pomodoroLogs.unshift({
      id: uid("pomodoro"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...withBilingualFields(payload, bilingualFieldsByCollection.pomodoroLogs),
    });
  }

  function addDistraction(payload) {
    state.distractionLogs.unshift({
      id: uid("distraction"),
      date: today.value,
      createdAt: new Date().toISOString(),
      done: false,
      ...withBilingualFields(payload, bilingualFieldsByCollection.distractionLogs),
    });
  }

  function toggleDistraction(id) {
    const item = state.distractionLogs.find((log) => log.id === id);
    if (item) item.done = !item.done;
  }

  function addKnowledgeReview(payload) {
    state.knowledgeReviews.unshift({
      id: uid("knowledge-review"),
      date: today.value,
      createdAt: new Date().toISOString(),
      reviewed: false,
      ...withBilingualFields(payload, bilingualFieldsByCollection.knowledgeReviews),
    });
  }

  function addExamAnalysis(payload) {
    state.examAnalyses.unshift({
      id: uid("ea"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...withBilingualFields(payload, bilingualFieldsByCollection.examAnalyses),
    });
  }

  function addExpense(payload) {
    state.expenses.unshift({
      id: uid("exp"),
      date: today.value,
      createdAt: new Date().toISOString(),
      type: payload.type === "income" ? "income" : "expense",
      ...withBilingualFields(payload, bilingualFieldsByCollection.expenses),
    });
  }

  function addDailyCheckin(payload) {
    state.dailyCheckins.unshift({
      id: uid("daily-checkin"),
      createdAt: new Date().toISOString(),
      title: setChineseSourceText(undefined, payload.title || ""),
      kind: payload.kind === "check" ? "check" : "number",
      target: Number(payload.target || 0),
      unit: setChineseSourceText(undefined, payload.unit || ""),
      active: true,
    });
  }

  function updateDailyCheckin(id, patch) {
    const item = state.dailyCheckins.find((entry) => entry.id === id);
    if (!item) return;
    if ("title" in patch) item.title = setChineseSourceText(item.title, patch.title);
    if ("unit" in patch) item.unit = setChineseSourceText(item.unit, patch.unit || "");
    if ("kind" in patch) item.kind = patch.kind === "check" ? "check" : "number";
    if ("target" in patch) item.target = Number(patch.target || 0);
    if ("active" in patch) item.active = patch.active !== false;
  }

  function deleteDailyCheckin(id) {
    state.dailyCheckins = state.dailyCheckins.filter((item) => item.id !== id);
    Object.values(state.dailyCheckinLogs).forEach((records) => {
      if (records && typeof records === "object") delete records[id];
    });
  }

  function isDailyCheckinComplete(item, value, explicitDone) {
    if (!item) return Boolean(explicitDone);
    if (item.kind === "check") return Boolean(explicitDone);
    const text = String(value ?? "").trim();
    if (!text) return Boolean(explicitDone);
    const amount = Number(text);
    if (Number(item.target || 0) > 0) return Number.isFinite(amount) && amount >= Number(item.target);
    return true;
  }

  function updateDailyCheckinRecord(date, itemId, payload = {}) {
    const day = date || today.value;
    const item = state.dailyCheckins.find((entry) => entry.id === itemId);
    if (!item) return;
    if (!state.dailyCheckinLogs[day]) state.dailyCheckinLogs[day] = {};
    const current = state.dailyCheckinLogs[day][itemId] || {};
    const value = "value" in payload ? String(payload.value ?? "") : current.value || "";
    const explicitDone = "done" in payload ? payload.done : current.done;
    state.dailyCheckinLogs[day][itemId] = {
      itemId,
      date: day,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      value,
      done: isDailyCheckinComplete(item, value, explicitDone),
      note: "note" in payload ? setChineseSourceText(current.note, payload.note || "") : current.note || setChineseSourceText(undefined, ""),
    };
  }

  function toggleDailyCheckinRecord(date, itemId) {
    const day = date || today.value;
    const item = state.dailyCheckins.find((entry) => entry.id === itemId);
    if (!item) return;
    const current = state.dailyCheckinLogs[day]?.[itemId];
    const nextDone = !current?.done;
    const patch = { done: nextDone };
    if (nextDone && item.kind === "number" && Number(item.target || 0) > 0 && !current?.value) {
      patch.value = String(item.target);
    }
    updateDailyCheckinRecord(day, itemId, patch);
  }

  function clearDailyCheckinRecord(date, itemId) {
    const day = date || today.value;
    if (!state.dailyCheckinLogs[day]) return;
    delete state.dailyCheckinLogs[day][itemId];
  }

  function normalizeRequestedPlanDays(value) {
    const count = Math.floor(Number(value || 0));
    if (!Number.isFinite(count)) return 1;
    return Math.min(120, Math.max(1, count));
  }

  function buildPlanPage(day, existing) {
    return {
      id: existing?.id || uid("plan-page"),
      day,
      title: existing?.title || setChineseSourceText(undefined, `第 ${day} 天计划`),
      goal: existing?.goal || setChineseSourceText(undefined, ""),
      tasks: existing?.tasks || setChineseSourceText(undefined, ""),
      output: existing?.output || setChineseSourceText(undefined, ""),
      todos: Array.isArray(existing?.todos) ? existing.todos : [],
      done: Boolean(existing?.done),
    };
  }

  function generatePagedPlan(days) {
    const count = normalizeRequestedPlanDays(days);
    const existingByDay = new Map((state.pagedPlan?.pages || []).map((page) => [Number(page.day || 0), page]));
    state.pagedPlan = {
      days: count,
      generatedAt: new Date().toISOString(),
      pages: Array.from({ length: count }, (_, index) => {
        const day = index + 1;
        return buildPlanPage(day, existingByDay.get(day));
      }),
    };
    showToast?.(t("计划已生成。"));
  }

  function updatePagedPlanPage(id, patch = {}) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === id);
    if (!page) return;
    if ("title" in patch) page.title = setChineseSourceText(page.title, patch.title);
    if ("goal" in patch) page.goal = setChineseSourceText(page.goal, patch.goal);
    if ("tasks" in patch) page.tasks = setChineseSourceText(page.tasks, patch.tasks);
    if ("output" in patch) page.output = setChineseSourceText(page.output, patch.output);
    if ("done" in patch) page.done = Boolean(patch.done);
  }

  function togglePagedPlanPage(id) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === id);
    if (page) page.done = !page.done;
  }

  function addPagedPlanTodo(pageId, text) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === pageId);
    const cleanText = String(text || "").trim();
    if (!page || !cleanText) return;
    if (!Array.isArray(page.todos)) page.todos = [];
    page.todos.push({
      id: uid("plan-todo"),
      text: setChineseSourceText(undefined, cleanText),
      done: false,
    });
  }

  function togglePagedPlanTodo(pageId, todoId) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === pageId);
    const todo = page?.todos?.find((item) => item.id === todoId);
    if (todo) todo.done = !todo.done;
  }

  function updatePagedPlanTodo(pageId, todoId, text) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === pageId);
    const todo = page?.todos?.find((item) => item.id === todoId);
    if (todo) todo.text = setChineseSourceText(todo.text, text);
  }

  function deletePagedPlanTodo(pageId, todoId) {
    const page = state.pagedPlan?.pages?.find((item) => item.id === pageId);
    if (page?.todos) page.todos = page.todos.filter((item) => item.id !== todoId);
  }

  function toggleKnowledgeReviewReviewed(id) {
    const item = state.knowledgeReviews.find((review) => review.id === id);
    if (item) item.reviewed = !item.reviewed;
  }

  function addIdea(payload) {
    state.ideas.unshift({
      id: uid("idea"),
      date: today.value,
      createdAt: new Date().toISOString(),
      parked: true,
      ...withBilingualFields(payload, bilingualFieldsByCollection.ideas),
    });
  }

  function addInspiration(payload) {
    state.inspirations.unshift({
      id: uid("inspiration"),
      date: today.value,
      createdAt: new Date().toISOString(),
      category: payload.category || "梦想生活",
      ...withBilingualFields(payload, bilingualFieldsByCollection.inspirations),
    });
  }

  function convertIdeaToTask(id) {
    const idea = state.ideas.find((item) => item.id === id);
    if (!idea) return;
    const ideaText = textValue(idea.text, "zh");
    const ideaReason = textValue(idea.reason, "zh");
    state.tasks.unshift({
      id: uid("task"),
      level: "base",
      title: setChineseSourceText(undefined, `奖励任务：${ideaText}`),
      subject: "ds",
      minutes: 25,
      detail: setChineseSourceText(undefined, ideaReason || "限定 25 分钟，做完立刻回到主线。"),
      done: false,
    });
    idea.parked = false;
  }

  function importState(nextState) {
    replaceState(nextState);
    saveLocal();
    saveServer();
  }

  function resetState() {
    replaceState({});
    saveLocal();
    saveServer();
  }

  const todayPractice = computed(() =>
    state.practiceLogs.filter((log) => log.date === today.value).reduce((sum, log) => sum + Number(log.total || 0), 0),
  );
  const todaySentences = computed(() => state.sentenceLogs.filter((log) => log.date === today.value).length);
  const todayPomodoros = computed(() => state.pomodoroLogs.filter((log) => log.date === today.value).length);
  const todayDistractions = computed(() => state.distractionLogs.filter((log) => log.date === today.value).length);
  const todayMinutes = computed(() =>
    [...state.focusLogs, ...state.pomodoroLogs]
      .filter((log) => log.date === today.value && log.subject !== "nonStudy")
      .reduce((sum, log) => sum + Number(log.minutes || 0), 0),
  );

  const weekStats = computed(() => {
    const weekStart = startOfWeek(new Date());
    const logs = [...state.focusLogs, ...state.pomodoroLogs].filter((log) => new Date(log.createdAt || `${log.date}T12:00:00`) >= weekStart);
    const minutes = logs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const bySubject = {};
    logs.forEach((log) => {
      bySubject[log.subject] = (bySubject[log.subject] || 0) + Number(log.minutes || 0);
    });
    const topSubject = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]?.[0];
    const causes = {};
    state.knowledgeReviews.forEach((review) => {
      causes[review.cause] = (causes[review.cause] || 0) + 1;
    });
    const topCause = Object.entries(causes).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      minutes,
      topSubject: topSubject ? subjectName(topSubject) : "--",
      topCause: topCause ? t(topCause) : "--",
      nextFocus: topCause ? t(topCause) : t("知识点复盘"),
    };
  });

  const promptByGroup = computed(() => {
    const groups = {};
    state.promptCards.forEach((card) => {
      if (!groups[card.group]) groups[card.group] = [];
      groups[card.group].push(card);
    });
    return Object.fromEntries(
      Object.entries(groups).map(([group, cards]) => [group, cards[Math.floor(Math.random() * cards.length)]]),
    );
  });

  function promptFor(group) {
    return tx(promptByGroup.value[group]?.text || promptByGroup.value.dashboard?.text || "慢慢来，小小鱼也能游到岸边。");
  }

  return {
    state,
    loaded,
    syncStatus,
    language,
    isEnglish,
    today,
    daysLeft,
    todayPractice,
    todaySentences,
    todayPomodoros,
    todayDistractions,
    todayMinutes,
    weekStats,
    promptFor,
    setLanguage,
    notify,
    setAvatarImage,
    t,
    tx,
    textSource,
    renderBold,
    initialize,
    subjectName,
    maybeResetDailyTasks,
    setExamDate,
    selectMood,
    resetDailyTasks,
    applyMoodTasks,
    toggleTask,
    addFocusLog,
    updateById,
    updateTranslation,
    minutesBetween,
    addCountdown,
    toggleCountdownTodo,
    updateCountdown,
    updateCountdownTodoTranslation,
    updateTopicStatus,
    addTopic,
    addBranch,
    deleteTopic,
    deleteBranch,
    deriveHealth,
    addReviewRecord,
    deleteReviewRecord,
    addSubjectOutputRecord,
    deleteSubjectOutputRecord,
    addPracticeLog,
    addSentenceLog,
    saveActiveTimer,
    clearActiveTimer,
    getActiveTimer,
    addPomodoroLog,
    addDistraction,
    toggleDistraction,
    addKnowledgeReview,
    addExamAnalysis,
    addExpense,
    addDailyCheckin,
    updateDailyCheckin,
    deleteDailyCheckin,
    updateDailyCheckinRecord,
    toggleDailyCheckinRecord,
    clearDailyCheckinRecord,
    generatePagedPlan,
    updatePagedPlanPage,
    togglePagedPlanPage,
    addPagedPlanTodo,
    togglePagedPlanTodo,
    updatePagedPlanTodo,
    deletePagedPlanTodo,
    toggleKnowledgeReviewReviewed,
    addIdea,
    addInspiration,
    convertIdeaToTask,
    deleteById,
    importState,
    resetState,
  };
}
