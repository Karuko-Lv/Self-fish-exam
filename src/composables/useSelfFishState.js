import { computed, reactive, ref, watch } from "vue";
import { subjects } from "../constants/defaults.js";
import { daysUntil, startOfWeek, studyDayISO, todayISO } from "../utils/dates.js";
import { localStorageKeyForUser, normalizeState, uid } from "../utils/state.js";

export function useSelfFishState(user, showToast) {
  const state = reactive(normalizeState({}));
  const loaded = ref(false);
  const syncStatus = ref("等待登录");
  let saveTimer = null;
  let suppressSave = false;

  const today = computed(() => todayISO());
  const daysLeft = computed(() => daysUntil(state.examDate));

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

  function subjectName(id) {
    return subjects.find((subject) => subject.id === id)?.name || id;
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
      .find((item) => item.status === "wrong" || item.status === "fragile");
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
      title,
      subject: weakSubject,
      minutes,
      detail,
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
      ...payload,
      minutes,
    });
  }

  function deleteById(collection, id) {
    state[collection] = state[collection].filter((item) => item.id !== id);
  }

  function updateById(collection, id, patch) {
    const item = state[collection]?.find((entry) => entry.id === id);
    if (!item) return;
    Object.assign(item, patch);
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
      todos: (payload.todos || []).map((todo, index) => ({
        id: todo.id || `${id}-todo-${index}`,
        text: todo.text,
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
    updateById("countdownEvents", eventId, patch);
  }

  function updateTopicStatus(subjectId, topicId, status) {
    const topic = state.topicState[subjectId]?.find((item) => item.id === topicId);
    if (topic) topic.status = status;
  }

  function addPracticeLog(payload) {
    state.practiceLogs.unshift({
      id: uid("practice"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  function addSentenceLog(payload) {
    state.sentenceLogs.unshift({
      id: uid("sentence"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  function addPomodoroLog(payload) {
    state.pomodoroLogs.unshift({
      id: uid("pomodoro"),
      date: today.value,
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  function addDistraction(payload) {
    state.distractionLogs.unshift({
      id: uid("distraction"),
      date: today.value,
      createdAt: new Date().toISOString(),
      done: false,
      ...payload,
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
      ...payload,
    });
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
      ...payload,
    });
  }

  function convertIdeaToTask(id) {
    const idea = state.ideas.find((item) => item.id === id);
    if (!idea) return;
    state.tasks.unshift({
      id: uid("task"),
      level: "base",
      title: `奖励任务：${idea.text}`,
      subject: "ds",
      minutes: 25,
      detail: idea.reason || "限定 25 分钟，做完立刻回到主线。",
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
      topCause: topCause || "--",
      nextFocus: topCause || "知识点复盘",
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
    return promptByGroup.value[group]?.text || promptByGroup.value.dashboard?.text || "慢慢来，小小鱼也能游到岸边。";
  }

  return {
    state,
    loaded,
    syncStatus,
    today,
    daysLeft,
    todayPractice,
    todaySentences,
    todayPomodoros,
    todayDistractions,
    todayMinutes,
    weekStats,
    promptFor,
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
    minutesBetween,
    addCountdown,
    toggleCountdownTodo,
    updateCountdown,
    updateTopicStatus,
    addPracticeLog,
    addSentenceLog,
    addPomodoroLog,
    addDistraction,
    toggleDistraction,
    addKnowledgeReview,
    toggleKnowledgeReviewReviewed,
    addIdea,
    convertIdeaToTask,
    deleteById,
    importState,
    resetState,
  };
}
