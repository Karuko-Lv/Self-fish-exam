(function () {
  "use strict";

  const STORAGE_KEY = "selfFish408.v1";
  const SERVER_STATE_ENDPOINT = "/api/state";
  const SERVER_SAVE_DELAY = 500;
  const serverSync = {
    available: false,
    loaded: false,
    saveTimer: null,
    saveInFlight: false,
    needsSave: false,
  };
  const toLocalISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayISO = () => toLocalISO(new Date());

  const subjects = [
    { id: "ds", name: "数据结构", accent: "#20786f" },
    { id: "co", name: "计算机组成原理", accent: "#e95d48" },
    { id: "os", name: "操作系统", accent: "#6d63b4" },
    { id: "net", name: "计算机网络", accent: "#d8a229" },
    { id: "math1", name: "数学一", accent: "#2f80ed" },
    { id: "english1", name: "英语一", accent: "#b05ca8" },
  ];
  const nonStudySubject = { id: "nonStudy", name: "非学习", accent: "#8e8e93" };
  const timerSubjects = [...subjects, nonStudySubject];

  const statusList = [
    { id: "empty", label: "未启", score: 0 },
    { id: "fragile", label: "虚", score: 1 },
    { id: "basic", label: "基础", score: 2 },
    { id: "wrong", label: "错多", score: 2 },
    { id: "mastered", label: "掌握", score: 4 },
    { id: "review", label: "复盘", score: 3 },
  ];

  const mistakeCauses = ["概念不清", "公式不会", "题意误判", "粗心", "时间不够", "知识迁移失败"];
  const distractionTypes = {
    idea: "新想法",
    phone: "手机/消息",
    worry: "焦虑担心",
    task: "杂事",
    other: "其他",
  };
  const breakSuggestions = [
    "站起来喝水，眼睛看远处 30 秒。",
    "做 8 次慢呼吸，肩膀放松下来。",
    "离开屏幕走 2 分钟，不刷短视频。",
    "整理桌面 1 分钟，只收走最碍眼的东西。",
    "闭眼休息 60 秒，然后写下下一步要做什么。",
    "做一次颈部拉伸，回来直接点开始。",
  ];

  const moods = [
    {
      id: "clear",
      title: "清醒",
      desc: "适合啃主线",
      advice: "先做标准任务，再把一个高频错因推进到复盘。数一和英语也可以各补一小组。",
    },
    {
      id: "anxious",
      title: "焦虑",
      desc: "先落地再加速",
      advice: "只开保底任务，做完再判断今天要不要加码。",
    },
    {
      id: "slump",
      title: "摆烂",
      desc: "门槛降到最低",
      advice: "不要讲道理，直接做 25 分钟错题整理。",
    },
    {
      id: "excited",
      title: "兴奋",
      desc: "把热度接到主线",
      advice: "允许冲刺，但先完成一项 408 核心任务再碰新灵感。",
    },
    {
      id: "tired",
      title: "疲惫",
      desc: "保住连续性",
      advice: "复习轻任务优先：看错题、画框架、背协议字段。",
    },
    {
      id: "lost",
      title: "迷茫",
      desc: "只找下一步",
      advice: "从全科进度里找一个“错多”或“虚”的点，做 20 分钟。",
    },
  ];

  const seedTopics = {
    ds: ["线性表", "栈和队列", "树与二叉树", "图", "查找", "排序"],
    co: ["数据表示", "运算器", "存储系统", "指令系统", "CPU", "I/O 系统"],
    os: ["进程与线程", "处理机调度", "同步互斥", "内存管理", "文件系统", "I/O 管理"],
    net: ["物理层", "数据链路层", "网络层", "传输层", "应用层", "网络安全基础"],
    math1: ["高等数学", "线性代数", "概率论", "选择填空", "计算题速度", "真题复盘"],
    english1: ["阅读", "完形", "新题型", "翻译", "作文", "长难句"],
  };

  const defaultTasks = [
    {
      id: "task-base-1",
      level: "base",
      title: "25 分钟错题重启",
      subject: "ds",
      minutes: 25,
      detail: "只整理一道题：错因 + 正确触发条件。",
      done: false,
    },
    {
      id: "task-base-2",
      level: "base",
      title: "画一个知识点小框架",
      subject: "os",
      minutes: 20,
      detail: "不用完整，画出概念关系就算接上主线。",
      done: false,
    },
    {
      id: "task-standard-1",
      level: "standard",
      title: "408 主线推进一节",
      subject: "co",
      minutes: 90,
      detail: "看讲义 + 做 8 道基础题 + 标出不稳点。",
      done: false,
    },
    {
      id: "task-standard-2",
      level: "standard",
      title: "英一阅读一篇",
      subject: "english1",
      minutes: 45,
      detail: "计时做一篇阅读，复盘每个错选项为什么诱人。",
      done: false,
    },
    {
      id: "task-standard-3",
      level: "standard",
      title: "数一计算手感",
      subject: "math1",
      minutes: 60,
      detail: "做 10 道同类题，只追踪卡顿步骤。",
      done: false,
    },
    {
      id: "task-base-3",
      level: "base",
      title: "英一长难句拆解",
      subject: "english1",
      minutes: 20,
      detail: "至少拆一句：主干、修饰、卡点各写一点。",
      done: false,
    },
    {
      id: "task-standard-4",
      level: "standard",
      title: "408 错题二刷",
      subject: "net",
      minutes: 60,
      detail: "只刷上周错题，按错因重新分类。",
      done: false,
    },
    {
      id: "task-burst-1",
      level: "burst",
      title: "数一半套训练",
      subject: "math1",
      minutes: 150,
      detail: "计时做题，结束后只复盘最值钱的 3 个错误。",
      done: false,
    },
    {
      id: "task-burst-2",
      level: "burst",
      title: "跨科联动复盘",
      subject: "os",
      minutes: 120,
      detail: "把操作系统、组成原理里共享的存储/中断问题串起来。",
      done: false,
    },
  ];

  const moodTaskTemplates = {
    clear: [
      ["standard", "主线 90 分钟推进", "挑一个“虚”的知识点，看讲义后做 8 道题。"],
      ["burst", "错题高压复盘", "把近 7 天错题按错因重排，找出最该修的一类。"],
    ],
    anxious: [
      ["base", "25 分钟落地", "只做一道错题，从题干里圈出关键条件。"],
      ["standard", "低速主线", "看 20 分钟讲义，再做 5 道基础题。"],
    ],
    slump: [
      ["base", "桌面重启任务", "整理学习区 5 分钟，然后复盘一道已经做过的题。"],
      ["base", "只背一张卡", "选一个概念，用自己的话写 3 句。"],
    ],
    excited: [
      ["standard", "先把热度接到 408", "完成一节主线后，灵感才能进入停车场。"],
      ["burst", "冲刺训练", "计时 120 分钟，结束后只记录三个错因。"],
    ],
    tired: [
      ["base", "轻复盘", "看 3 道错题，不要求重做，只说出为什么错。"],
      ["standard", "框架补洞", "画一张科目小地图，把不稳点标出来。"],
    ],
    lost: [
      ["base", "找下一步", "打开全科进度，选一个“错多”点做 20 分钟。"],
      ["standard", "单点突破", "只抓一个知识点，不跨科，不扩展。"],
    ],
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let state = loadState();
  let activeMistakeFilter = "all";
  let activeDistractionFilter = "all";
  let breakSuggestionIndex = 0;
  let pendingSentenceScreenshot = "";
  let activeDoneDate = studyDayISO();
  let timerInterval = null;
  let timerState = {
    mode: "专注",
    direction: "down",
    duration: 25 * 60,
    remaining: 25 * 60,
    elapsed: 0,
    running: false,
    startedAt: null,
  };

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return normalizeState(JSON.parse(raw));
      } catch (error) {
        console.warn("Failed to parse saved state", error);
      }
    }
    return normalizeState({});
  }

  function normalizeState(input) {
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
    let tasks = Array.isArray(input.tasks) && input.tasks.length ? input.tasks : defaultTasks;
    if (!tasks.some((task) => task.subject === "math1")) {
      tasks = [...defaultTasks.filter((task) => task.subject === "math1"), ...tasks];
    }
    if (!tasks.some((task) => task.subject === "english1")) {
      tasks = [...defaultTasks.filter((task) => task.subject === "english1"), ...tasks];
    }
    tasks = tasks.slice(0, 14);

    const deletedTimerLogIds = Array.isArray(input.deletedTimerLogIds) ? input.deletedTimerLogIds : [];
    let focusLogs = Array.isArray(input.focusLogs) ? input.focusLogs : [];
    const legacyPomodoros = Array.isArray(input.pomodoroLogs) ? input.pomodoroLogs : [];
    legacyPomodoros.forEach((log) => {
      if (log.mode === "休息") return;
      const legacyId = log.id || `${log.date}-${log.subject}-${log.minutes}-${log.mode}`;
      if (deletedTimerLogIds.includes(legacyId)) return;
      const alreadyMigrated = focusLogs.some((item) => item.source === "timer" && item.timerLogId === legacyId);
      if (alreadyMigrated) return;
      focusLogs = [
        ...focusLogs,
        {
          id: `focus-${legacyId}`,
          date: log.date || todayISO(),
          subject: log.subject || "ds",
          minutes: Number(log.minutes || 0),
          note: log.note || `${log.mode || "专注"} ${Number(log.minutes || 0)} 分钟`,
          source: "timer",
          timerMode: log.mode || "专注",
          timerDirection: "down",
          seconds: Number(log.minutes || 0) * 60,
          timerLogId: legacyId,
        },
      ];
    });
    focusLogs = focusLogs.map((log) => ({
      ...log,
      isStudy: log.isStudy === false || log.subject === nonStudySubject.id ? false : true,
      workdayDate: log.workdayDate || logStudyDay(log),
    }));

    const legacyWordLogs = Array.isArray(input.wordLogs) ? input.wordLogs : [];
    const sentenceLogs = Array.isArray(input.sentenceLogs)
      ? input.sentenceLogs
      : legacyWordLogs.map((log) => ({
          id: log.id ? String(log.id).replace(/^words/, "sentence") : uid("sentence"),
          date: log.date || todayISO(),
          sentence:
            log.sentence ||
            (log.note
              ? `旧单词记录：${log.note}`
              : `旧单词记录：新词 ${Number(log.newWords || 0)} 个，复习 ${Number(log.reviewWords || 0)} 个。`),
          source: "由旧单词记录迁移",
          analysis: log.note || "",
          screenshot: "",
          migratedFromWords: true,
        }));

    const countdownEvents =
      Array.isArray(input.countdownEvents) && input.countdownEvents.length
        ? input.countdownEvents
        : [
            {
              id: "exam-2026",
              title: "2026 考研初试",
              date: input.examDate && input.examDate !== "2026-12-20" ? input.examDate : "2026-12-19",
              note: "主线目标日，加油小小鱼。",
              pinned: true,
            },
          ];

    return {
      examDate: input.examDate && input.examDate !== "2026-12-20" ? input.examDate : "2026-12-19",
      selectedMood: input.selectedMood || "",
      tasks,
      topicState,
      mistakes: Array.isArray(input.mistakes) ? input.mistakes : [],
      ideas: Array.isArray(input.ideas) ? input.ideas : [],
      focusLogs,
      practiceLogs: Array.isArray(input.practiceLogs) ? input.practiceLogs : [],
      sentenceLogs,
      pomodoroLogs: [],
      deletedTimerLogIds,
      countdownEvents,
      distractions: Array.isArray(input.distractions) ? input.distractions : [],
      uiSettings: {
        adaptiveFit: Boolean(input.uiSettings?.adaptiveFit),
      },
      lastResetDate: input.lastResetDate || todayISO(),
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleServerSave();
  }

  function saveLocalOnly() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function canUseServerStorage() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  async function loadStateFromServer() {
    if (!canUseServerStorage()) return;

    try {
      const response = await fetch(SERVER_STATE_ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;

      const remoteState = await response.json();
      serverSync.available = true;
      serverSync.loaded = true;

      if (remoteState && Object.keys(remoteState).length > 0) {
        const shouldCleanLegacyPomodoros =
          Array.isArray(remoteState.pomodoroLogs) && remoteState.pomodoroLogs.length > 0;
        state = normalizeState(remoteState);
        saveLocalOnly();
        maybeResetDailyTasks();
        renderAll();
        if (shouldCleanLegacyPomodoros) scheduleServerSave();
        showToast("已从服务器载入数据。");
        return;
      }

      await saveStateToServer();
      showToast("已连接服务器存储。");
    } catch (error) {
      console.warn("Server storage is unavailable, using localStorage instead.", error);
      serverSync.available = false;
    }
  }

  function scheduleServerSave() {
    if (!serverSync.available) return;
    window.clearTimeout(serverSync.saveTimer);
    serverSync.saveTimer = window.setTimeout(saveStateToServer, SERVER_SAVE_DELAY);
  }

  async function saveStateToServer() {
    if (!serverSync.available) return;
    if (serverSync.saveInFlight) {
      serverSync.needsSave = true;
      return;
    }
    serverSync.saveInFlight = true;
    serverSync.needsSave = false;
    try {
      const response = await fetch(SERVER_STATE_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error(`Save failed with ${response.status}`);
    } catch (error) {
      console.warn("Failed to save state to server.", error);
      showToast("服务器保存失败，已先保存在本机浏览器。");
    } finally {
      serverSync.saveInFlight = false;
      if (serverSync.needsSave) scheduleServerSave();
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeImageSrc(value) {
    const src = String(value || "");
    return src.startsWith("data:image/") ? src : "";
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsText(file, "utf8");
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = src;
    });
  }

  async function imageFileToDataURL(file) {
    if (!file?.type?.startsWith("image/")) {
      throw new Error("Only image files are supported");
    }
    const rawDataURL = await readFileAsDataURL(file);
    if (file.type === "image/gif" || file.type === "image/svg+xml") return rawDataURL;

    const image = await loadImage(rawDataURL);
    const maxEdge = 1400;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function subjectName(id) {
    return timerSubjects.find((subject) => subject.id === id)?.name || id;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function dateAdd(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalISO(date);
  }

  function shiftISODate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toLocalISO(date);
  }

  function studyDayISO(date = new Date()) {
    const shifted = new Date(date);
    if (shifted.getHours() < 6) shifted.setDate(shifted.getDate() - 1);
    return toLocalISO(shifted);
  }

  function studyDayRange(dateString) {
    const start = new Date(`${dateString}T06:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  function formatShortDay(date) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  }

  function logStudyDay(log) {
    if (log.workdayDate) return log.workdayDate;
    const timestamp = log.endedAt || log.completedAt || log.createdAt;
    if (timestamp && String(timestamp).includes("T")) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) return studyDayISO(date);
    }
    return log.date || todayISO();
  }

  function isDue(date) {
    return date <= todayISO();
  }

  function daysUntil(dateString) {
    const target = new Date(`${dateString}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
  }

  function syncExamCountdown() {
    const index = state.countdownEvents.findIndex((event) => event.pinned || event.id === "exam-2026");
    const examEvent = {
      id: "exam-2026",
      title: "2026 考研初试",
      date: state.examDate,
      note: "主线目标日，加油小小鱼。",
      pinned: true,
    };
    if (index >= 0) {
      state.countdownEvents[index] = { ...state.countdownEvents[index], ...examEvent };
    } else {
      state.countdownEvents.unshift(examEvent);
    }
  }

  function startOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - day + 1);
    return result;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function init() {
    bindNavigation();
    bindForms();
    fillSelects();
    maybeResetDailyTasks();
    renderAll();
    loadStateFromServer();
  }

  function bindNavigation() {
    $$(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.view;
        $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button));
        $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `view-${view}`));
        if (view === "review") renderWeeklyReview();
        if (view === "timer") renderTimer();
      });
    });
  }

  function bindForms() {
    $("#examDate").addEventListener("change", (event) => {
      state.examDate = event.target.value;
      syncExamCountdown();
      saveState();
      renderCountdown();
      renderCountdownEvents();
    });

    $("#resetTodayBtn").addEventListener("click", () => {
      state.tasks = state.tasks.map((task) => ({ ...task, done: false }));
      state.lastResetDate = todayISO();
      saveState();
      renderTasks();
      showToast("今日任务已重置。");
    });

    $("#suggestTasksBtn").addEventListener("click", () => {
      applyMoodTasks();
      showToast("已按当前状态调整任务入口。");
    });

    $("#focusForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const minutes = Number($("#focusMinutes").value || 0);
      if (minutes < 5) {
        showToast("至少记录 5 分钟，给自己一点真实证据。");
        return;
      }
      state.focusLogs.unshift({
        id: uid("focus"),
        date: todayISO(),
        subject: $("#focusSubject").value,
        minutes,
        note: $("#focusNote").value.trim() || "完成一组学习",
        source: "manual",
        isStudy: true,
      });
      $("#focusNote").value = "";
      saveState();
      renderFocus();
      renderMomentumCanvas();
      showToast("已记录，这就是今天的证据。");
    });

    $("#practiceForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const total = Number($("#practiceTotal").value || 0);
      const correct = Number($("#practiceCorrect").value || 0);
      const minutes = Number($("#practiceMinutes").value || 0);
      if (total < 1 || correct > total) {
        showToast("题数要大于 0，正确数不能超过总题数。");
        return;
      }
      const practiceId = uid("practice");
      const focusLogId = uid("focus");
      state.practiceLogs.unshift({
        id: practiceId,
        date: todayISO(),
        subject: $("#practiceSubject").value,
        source: $("#practiceSource").value.trim(),
        total,
        correct,
        minutes,
        note: $("#practiceNote").value.trim(),
        focusLogId,
      });
      state.focusLogs.unshift({
        id: focusLogId,
        date: todayISO(),
        subject: $("#practiceSubject").value,
        minutes,
        note: `刷题：${$("#practiceSource").value.trim()}`,
        source: "practice",
        practiceLogId: practiceId,
        isStudy: true,
      });
      event.target.reset();
      $("#practiceTotal").value = 10;
      $("#practiceCorrect").value = 7;
      $("#practiceMinutes").value = 30;
      saveState();
      renderPractice();
      renderFocus();
      renderCountdown();
      renderMomentumCanvas();
      showToast("刷题记录已保存。");
    });

    $("#sentenceScreenshot").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        pendingSentenceScreenshot = "";
        renderSentenceScreenshotPreview();
        return;
      }
      try {
        pendingSentenceScreenshot = await imageFileToDataURL(file);
        renderSentenceScreenshotPreview();
        showToast("截图已准备好，保存后会跟这句一起存档。");
      } catch (error) {
        console.warn("Failed to read sentence screenshot", error);
        event.target.value = "";
        pendingSentenceScreenshot = "";
        renderSentenceScreenshotPreview();
        showToast("截图读取失败，换一张图片试试。");
      }
    });

    $("#wordForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const sentence = $("#sentenceText").value.trim();
      if (!sentence) {
        showToast("今天至少留下一句长难句。");
        return;
      }
      state.sentenceLogs.unshift({
        id: uid("sentence"),
        date: todayISO(),
        sentence,
        source: $("#sentenceSource").value.trim(),
        analysis: $("#sentenceNote").value.trim(),
        screenshot: pendingSentenceScreenshot,
      });
      event.target.reset();
      pendingSentenceScreenshot = "";
      renderSentenceScreenshotPreview();
      saveState();
      renderSentences();
      renderCountdown();
      showToast("长难句已保存，今天的英语一有证据了。");
    });

    $("#countdownForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.countdownEvents.unshift({
        id: uid("countdown"),
        title: $("#countdownTitle").value.trim(),
        date: $("#countdownDate").value,
        note: $("#countdownNote").value.trim(),
        pinned: false,
      });
      event.target.reset();
      $("#countdownDate").value = dateAdd(7);
      saveState();
      renderCountdown();
      renderCountdownEvents();
      showToast("倒数日已保存。");
    });

    $("#distractionForm").addEventListener("submit", (event) => {
      event.preventDefault();
      addDistraction({
        text: $("#distractionText").value.trim(),
        type: $("#distractionType").value,
        reviewTime: $("#distractionReviewTime").value,
        source: "distractions",
      });
      event.target.reset();
    });

    $("#quickDistractionForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = $("#quickDistractionText").value.trim();
      if (!text) {
        showToast("先写一句飘走的念头。");
        return;
      }
      addDistraction({
        text,
        type: "idea",
        reviewTime: "",
        source: "timer",
      });
      $("#quickDistractionText").value = "";
    });

    $("#mistakeForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.mistakes.unshift({
        id: uid("mistake"),
        subject: $("#mistakeSubject").value,
        topic: $("#mistakeTopic").value.trim(),
        cause: $("#mistakeCause").value,
        reviewDate: $("#mistakeReviewDate").value,
        summary: $("#mistakeSummary").value.trim(),
        createdAt: todayISO(),
      });
      event.target.reset();
      $("#mistakeReviewDate").value = dateAdd(2);
      saveState();
      renderMistakes();
      renderWeeklyReview();
      showToast("错题已进入复盘池。");
    });

    $("#ideaForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.ideas.unshift({
        id: uid("idea"),
        text: $("#ideaText").value.trim(),
        reason: $("#ideaReason").value.trim(),
        createdAt: todayISO(),
      });
      event.target.reset();
      saveState();
      renderIdeas();
      showToast("灵感已停车，主线先不被劫走。");
    });

    $("#makeRestartBtn").addEventListener("click", () => {
      state.tasks.unshift({
        id: uid("task"),
        level: "base",
        title: "断档重启：15 + 25",
        subject: "ds",
        minutes: 40,
        detail: "15 分钟整理桌面和资料，25 分钟只复盘一道错题。",
        done: false,
      });
      saveState();
      renderTasks();
      showToast("重启任务已放到今日泳池。");
    });

    $("#writeReviewBtn").addEventListener("click", () => {
      renderWeeklyAdvice(true);
      showToast("周复盘建议已更新。");
    });

    $("#importBtn").addEventListener("click", () => {
      $("#importFileInput").click();
    });
    $("#importFileInput").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const confirmed = window.confirm("导入会覆盖当前页面里的全部数据，是否继续？");
      if (!confirmed) return;

      try {
        const raw = await readFileAsText(file);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Invalid state payload");
        }
        state = normalizeState(parsed);
        fillSelects();
        saveState();
        renderAll();
        showToast("数据已导入，正在同步到当前服务器。");
      } catch (error) {
        console.warn("Failed to import state file.", error);
        showToast("导入失败：请确认是本应用导出的 JSON 文件。");
      }
    });

    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `xiaoxiaoyu-plan-${todayISO()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("数据已导出。");
    });

    $("#resetDataBtn").addEventListener("click", () => {
      const confirmed = window.confirm("确定清空这个浏览器里的所有学习数据吗？这个操作不会影响导出的备份。");
      if (!confirmed) return;
      localStorage.removeItem(STORAGE_KEY);
      state = normalizeState({});
      fillSelects();
      saveState();
      renderAll();
      showToast("已回到初始状态。");
    });

    $$(".preset-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (timerState.running) stopTimer();
        const seconds = Number(button.dataset.minutes) * 60;
        timerState = {
          mode: button.dataset.mode,
          direction: timerState.direction,
          duration: seconds,
          remaining: seconds,
          elapsed: 0,
          running: false,
          startedAt: null,
        };
        $$(".preset-button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderTimer();
      });
    });

    $$(".timer-direction-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (timerState.running) stopTimer();
        timerState.direction = button.dataset.direction;
        timerState.remaining = timerState.duration;
        timerState.elapsed = 0;
        timerState.startedAt = null;
        $$(".timer-direction-button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderTimer();
      });
    });

    $("#timerStartBtn").addEventListener("click", startTimer);
    $("#timerPauseBtn").addEventListener("click", () => {
      stopTimer();
      renderTimer();
    });
    $("#timerResetBtn").addEventListener("click", () => {
      stopTimer();
      timerState.remaining = timerState.duration;
      timerState.elapsed = 0;
      timerState.startedAt = null;
      renderTimer();
    });
    $("#timerCompleteBtn").addEventListener("click", () => completePomodoro(true));
    $("#doneListDate").addEventListener("change", (event) => {
      activeDoneDate = event.target.value || studyDayISO();
      renderDoneList();
    });
    $("#donePrevDayBtn").addEventListener("click", () => {
      activeDoneDate = shiftISODate(activeDoneDate, -1);
      renderDoneList();
    });
    $("#doneTodayBtn").addEventListener("click", () => {
      activeDoneDate = studyDayISO();
      renderDoneList();
    });
    $("#doneNextDayBtn").addEventListener("click", () => {
      activeDoneDate = shiftISODate(activeDoneDate, 1);
      renderDoneList();
    });
    $("#nextBreakBtn").addEventListener("click", () => {
      breakSuggestionIndex = (breakSuggestionIndex + 1) % breakSuggestions.length;
      renderBreakSuggestion();
    });
    $("#adaptiveFitBtn").addEventListener("click", () => {
      state.uiSettings.adaptiveFit = !state.uiSettings.adaptiveFit;
      saveState();
      applyUiSettings();
      showToast(state.uiSettings.adaptiveFit ? "已开启自适应界面。" : "已关闭自适应界面。");
    });

    $$(".mistake-filter-chip").forEach((button) => {
      button.addEventListener("click", () => {
        activeMistakeFilter = button.dataset.filter;
        $$(".mistake-filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
        renderMistakes();
      });
    });

    $$(".distraction-filter-chip").forEach((button) => {
      button.addEventListener("click", () => {
        activeDistractionFilter = button.dataset.filter;
        $$(".distraction-filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
        renderDistractions();
      });
    });
  }

  function fillSelects() {
    const subjectOptions = subjects
      .map((subject) => `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`)
      .join("");
    const timerSubjectOptions = timerSubjects
      .map((subject) => `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`)
      .join("");
    $("#focusSubject").innerHTML = subjectOptions;
    $("#mistakeSubject").innerHTML = subjectOptions;
    $("#practiceSubject").innerHTML = subjectOptions;
    $("#timerSubject").innerHTML = timerSubjectOptions;
    $("#mistakeCause").innerHTML = mistakeCauses.map((cause) => `<option value="${cause}">${cause}</option>`).join("");
    $("#mistakeReviewDate").value = dateAdd(2);
    $("#countdownDate").value = dateAdd(7);
  }

  function maybeResetDailyTasks() {
    if (state.lastResetDate !== todayISO()) {
      state.tasks = state.tasks.map((task) => ({ ...task, done: false }));
      state.lastResetDate = todayISO();
      saveState();
    }
  }

  function renderAll() {
    applyUiSettings();
    $("#examDate").value = state.examDate;
    renderCountdown();
    renderMoods();
    renderTasks();
    renderFocus();
    renderPractice();
    renderSentences();
    renderSentenceScreenshotPreview();
    renderCountdownEvents();
    renderDistractions();
    renderBreakSuggestion();
    renderTimer();
    renderPomodoroList();
    renderSubjectMap();
    renderMistakes();
    renderIdeas();
    renderWeeklyReview();
    renderMomentumCanvas();
  }

  function applyUiSettings() {
    document.body.classList.toggle("adaptive-fit", Boolean(state.uiSettings?.adaptiveFit));
    const isEnabled = Boolean(state.uiSettings?.adaptiveFit);
    $("#adaptiveStatus").textContent = isEnabled ? "自适应开启" : "自适应关闭";
    $("#adaptiveFitLabel").textContent = isEnabled ? "关闭自适应匹配界面大小" : "开启自适应匹配界面大小";
    $("#adaptiveFitIcon").textContent = isEnabled ? "✓" : "↔";
  }

  function renderCountdown() {
    const target = new Date(`${state.examDate}T00:00:00`);
    const now = new Date();
    const diff = Math.ceil((target - now) / 86400000);
    const safeDiff = Number.isFinite(diff) ? Math.max(diff, 0) : "--";
    $("#daysLeft").textContent = safeDiff;
    $("#headlineDays").textContent = safeDiff;
    document.title = `${safeDiff} 天，加油小小鱼`;
    $("#dailyLine").textContent = buildDailyLine(diff);
    renderDashboardStats();
  }

  function buildDailyLine(diff) {
    const done = state.tasks.filter((task) => task.done).length;
    const due = state.mistakes.filter((mistake) => isDue(mistake.reviewDate)).length;
    const problems = todayPracticeTotals().total;
    const sentences = todaySentenceTotals().count;
    const openDistractions = state.distractions.filter((item) => !item.done).length;
    if (diff <= 0) return "目标日已到。现在只做一件事：把能拿的分稳稳拿住。";
    if (openDistractions >= 3) return `分心停车场里有 ${openDistractions} 条念头，休息时处理 1 条就好。`;
    if (done === 0 && due > 0) return `今天有 ${due} 道错题该复盘，先从最小的一道开始。`;
    if (problems === 0) return "今天还没有刷题记录。先来一小组，数一或英一都算把主线接上。";
    if (sentences === 0) return "刷题已经有了，长难句还差一句。给英语一留 10 分钟。";
    if (done > 0) return `已经完成 ${done} 项，今天不是空白页。接下来只需要再推进一点。`;
    return "先选状态，再从保底任务开始。启动比完美计划更重要。";
  }

  function renderDashboardStats() {
    const practice = todayPracticeTotals();
    const sentences = todaySentenceTotals();
    const pomodoros = doneListSessions(studyDayISO()).length;
    const distractions = state.distractions.filter((item) => item.createdAt === todayISO()).length;
    $("#todayProblemCount").textContent = practice.total;
    $("#todayWordCount").textContent = sentences.count;
    $("#todayPomodoroCount").textContent = pomodoros;
    $("#todayDistractionCount").textContent = distractions;
    renderNextCountdownCard();
  }

  function renderNextCountdownCard() {
    const upcoming = sortedCountdownEvents().find((event) => daysUntil(event.date) >= 0);
    const card = $("#nextCountdownCard");
    if (!upcoming) {
      card.innerHTML = `<span>倒数日</span><strong>暂无未来事件</strong>`;
      return;
    }
    const days = daysUntil(upcoming.date);
    card.innerHTML = `
      <span>最近倒数日</span>
      <strong>${escapeHTML(upcoming.title)} · ${days} 天</strong>
      <small>${escapeHTML(upcoming.date)}</small>
    `;
  }

  function sortedCountdownEvents() {
    return [...state.countdownEvents].sort((a, b) => {
      const aDays = daysUntil(a.date);
      const bDays = daysUntil(b.date);
      if (aDays >= 0 && bDays < 0) return -1;
      if (aDays < 0 && bDays >= 0) return 1;
      return aDays - bDays;
    });
  }

  function renderCountdownEvents() {
    const events = sortedCountdownEvents();
    $("#countdownEventCount").textContent = `${events.length} 个日子`;
    $("#countdownEventList").innerHTML = events.length
      ? events.map(renderCountdownEventItem).join("")
      : `<div class="empty-state">还没有倒数日。先把考研、一模、阶段目标这些日子放进来。</div>`;

    $$(".delete-countdown").forEach((button) => {
      button.addEventListener("click", () => {
        state.countdownEvents = state.countdownEvents.filter((event) => event.id !== button.dataset.id);
        saveState();
        renderCountdown();
        renderCountdownEvents();
      });
    });

    $$(".pin-countdown").forEach((button) => {
      button.addEventListener("click", () => {
        const event = state.countdownEvents.find((item) => item.id === button.dataset.id);
        if (!event) return;
        state.examDate = event.date;
        state.countdownEvents = state.countdownEvents.map((item) => ({ ...item, pinned: item.id === event.id }));
        saveState();
        renderAll();
        showToast("已设为驾驶舱主倒数日。");
      });
    });
  }

  function renderCountdownEventItem(event) {
    const days = daysUntil(event.date);
    const dayText = days >= 0 ? `还有 ${days} 天` : `已过去 ${Math.abs(days)} 天`;
    return `
      <article class="countdown-event ${event.pinned ? "is-pinned" : ""}">
        <div class="countdown-event-days">
          <strong>${Math.abs(days)}</strong>
          <span>${days >= 0 ? "天后" : "天前"}</span>
        </div>
        <div class="countdown-event-main">
          <div class="item-title">${escapeHTML(event.title)}</div>
          <div class="item-meta">${escapeHTML(event.date)} · ${dayText}</div>
          <p class="item-summary">${escapeHTML(event.note || "没有备注，知道这个日子就已经很有用了。")}</p>
          <div class="item-actions">
            <button class="small-button pin-countdown" data-id="${event.id}" type="button">设为主倒数</button>
            ${event.pinned ? "" : `<button class="danger-button delete-countdown" data-id="${event.id}" type="button">删除</button>`}
          </div>
        </div>
      </article>
    `;
  }

  function renderMoods() {
    $("#moodGrid").innerHTML = moods
      .map(
        (mood) => `
          <button class="mood-card ${state.selectedMood === mood.id ? "is-active" : ""}" data-mood="${mood.id}" type="button">
                <strong>${escapeHTML(mood.title)}</strong>
                <span>${escapeHTML(mood.desc)}</span>
          </button>
        `,
      )
      .join("");

    $$(".mood-card").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedMood = button.dataset.mood;
        saveState();
        renderMoods();
        renderTasks();
      });
    });

    const mood = moods.find((item) => item.id === state.selectedMood);
    $("#moodAdvice").textContent = mood?.advice || "先选一个状态，系统会把任务门槛调到合适的位置。";
  }

  function renderTasks() {
    const levels = [
      { id: "base", title: "保底版", label: "25-40 分钟" },
      { id: "standard", title: "标准版", label: "60-120 分钟" },
      { id: "burst", title: "爆发版", label: "状态好再开" },
    ];

    $("#taskLanes").innerHTML = levels
      .map((level) => {
        const tasks = state.tasks.filter((task) => task.level === level.id);
        return `
          <section class="task-lane" aria-label="${level.title}">
            <div class="task-lane-header">
              <div class="task-lane-title">
                <span class="level-dot ${level.id}"></span>
                ${escapeHTML(level.title)}
              </div>
              <span class="metric-pill">${escapeHTML(level.label)}</span>
            </div>
            ${
              tasks.length
                ? tasks.map(renderTaskRow).join("")
                : `<div class="empty-state">这一档暂时空着。用“状态匹配”补一个入口。</div>`
            }
          </section>
        `;
      })
      .join("");

    $$(".task-check").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        state.tasks = state.tasks.map((task) =>
          task.id === checkbox.dataset.task ? { ...task, done: checkbox.checked } : task,
        );
        saveState();
        renderTasks();
        renderCountdown();
      });
    });
  }

  function renderTaskRow(task) {
    return `
      <label class="task-row ${task.done ? "is-done" : ""}">
        <input class="task-check" data-task="${task.id}" type="checkbox" ${task.done ? "checked" : ""} />
        <span>
          <span class="task-title">${escapeHTML(task.title)}</span>
          <span class="task-meta">${escapeHTML(subjectName(task.subject))} · ${Number(task.minutes) || 0} 分钟 · ${escapeHTML(task.detail)}</span>
        </span>
      </label>
    `;
  }

  function applyMoodTasks() {
    const selected = state.selectedMood || "slump";
    const templates = moodTaskTemplates[selected] || moodTaskTemplates.slump;
    const weakSubject = findWeakSubject();
    const generated = templates.map(([level, title, detail]) => ({
      id: uid("task-mood"),
      level,
      title,
      subject: weakSubject,
      minutes: level === "base" ? 25 : level === "standard" ? 75 : 120,
      detail,
      done: false,
    }));
    state.tasks = [...generated, ...state.tasks.filter((task) => !task.id.startsWith("task-mood"))].slice(0, 12);
    saveState();
    renderTasks();
  }

  function findWeakSubject() {
    const scores = subjects.map((subject) => {
      const topics = state.topicState[subject.id] || [];
      const score = topics.reduce((sum, topic) => {
        const status = statusList.find((item) => item.id === topic.status);
        return sum + (status?.score || 0);
      }, 0);
      return { id: subject.id, score };
    });
    scores.sort((a, b) => a.score - b.score);
    return scores[0]?.id || "ds";
  }

  function renderFocus() {
    const todayLogs = state.focusLogs.filter((log) => log.date === todayISO());
    const total = studyLogs(todayLogs).reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    $("#todayMinutes").textContent = `${total} 分钟`;
    $("#focusLog").innerHTML = todayLogs.length
      ? todayLogs
          .slice(0, 4)
          .map(
            (log) => `
              <div class="mini-item ${isNonStudyLog(log) ? "is-non-study" : ""}">
                <span>${escapeHTML(studyLogLabel(log))} · ${escapeHTML(subjectName(log.subject))} · ${escapeHTML(log.note)}</span>
                <div class="mini-actions">
                  <strong>${Number(log.minutes) || 0} 分钟</strong>
                  <button class="mini-delete-button delete-study-log" data-id="${escapeHTML(log.id)}" type="button" title="删除这条学习记录">×</button>
                </div>
              </div>
            `,
          )
          .join("")
      : `<div class="empty-state">还没有学习记录。先记一组 25 分钟，让今天有个锚点。</div>`;
    bindStudyLogDeleteButtons();
  }

  function bindStudyLogDeleteButtons() {
    $$(".delete-study-log").forEach((button) => {
      button.addEventListener("click", () => {
        deleteStudyLog(button.dataset.id);
      });
    });
  }

  function deleteStudyLog(id) {
    const deletedLog = state.focusLogs.find((log) => log.id === id);
    if (deletedLog?.timerLogId) {
      state.deletedTimerLogIds = Array.from(new Set([...(state.deletedTimerLogIds || []), deletedLog.timerLogId]));
    }
    state.focusLogs = state.focusLogs.filter((log) => log.id !== id);
    state.pomodoroLogs = [];
    saveState();
    renderFocus();
    renderTimer();
    renderCountdown();
    renderWeeklyReview();
    renderMomentumCanvas();
    showToast("学习记录已删除。");
  }

  function todayPracticeTotals() {
    const todayLogs = state.practiceLogs.filter((log) => log.date === todayISO());
    const total = todayLogs.reduce((sum, log) => sum + Number(log.total || 0), 0);
    const correct = todayLogs.reduce((sum, log) => sum + Number(log.correct || 0), 0);
    const minutes = todayLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    return { total, correct, minutes, accuracy: total ? Math.round((correct / total) * 100) : null };
  }

  function todaySentenceTotals() {
    const todayLogs = state.sentenceLogs.filter((log) => log.date === todayISO());
    return { count: todayLogs.length, goal: 1, hitGoal: todayLogs.length >= 1 };
  }

  function timerSessions() {
    return state.focusLogs
      .filter((log) => log.source === "timer" || log.timerMode);
  }

  function isNonStudyLog(log) {
    return log.isStudy === false || log.subject === nonStudySubject.id;
  }

  function studyLogs(logs) {
    return logs.filter((log) => !isNonStudyLog(log));
  }

  function studyLogLabel(log) {
    if (isNonStudyLog(log)) return "非学习计时";
    if (log.source === "timer" || log.timerMode) return "计时";
    if (log.source === "practice") return "刷题";
    return "手动";
  }

  function addDistraction({ text, type, reviewTime, source }) {
    if (!text) {
      showToast("先写一句分心内容。");
      return;
    }
    state.distractions.unshift({
      id: uid("distraction"),
      text,
      type: type || "other",
      reviewTime: reviewTime || "",
      source: source || "manual",
      createdAt: todayISO(),
      done: false,
    });
    saveState();
    renderDistractions();
    renderCountdown();
    showToast("先停在这里，继续回到当前这一小步。");
  }

  function filteredDistractions() {
    if (activeDistractionFilter === "open") return state.distractions.filter((item) => !item.done);
    if (activeDistractionFilter === "done") return state.distractions.filter((item) => item.done);
    return state.distractions;
  }

  function renderDistractions() {
    const items = filteredDistractions();
    const openCount = state.distractions.filter((item) => !item.done).length;
    $("#distractionCount").textContent = `${openCount} 条未处理`;
    $("#distractionList").innerHTML = items.length
      ? items.map(renderDistractionItem).join("")
      : `<div class="empty-state">分心不是失败。把念头放这里，专注结束后再处理。</div>`;

    $$(".complete-distraction").forEach((button) => {
      button.addEventListener("click", () => {
        state.distractions = state.distractions.map((item) =>
          item.id === button.dataset.id ? { ...item, done: true, completedAt: todayISO() } : item,
        );
        saveState();
        renderDistractions();
        renderCountdown();
        showToast("已处理一条分心。");
      });
    });

    $$(".delete-distraction").forEach((button) => {
      button.addEventListener("click", () => {
        state.distractions = state.distractions.filter((item) => item.id !== button.dataset.id);
        saveState();
        renderDistractions();
        renderCountdown();
      });
    });
  }

  function renderDistractionItem(item) {
    return `
      <article class="distraction-item ${item.done ? "is-done" : ""}">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(item.text)}</div>
            <div class="item-meta">${escapeHTML(distractionTypes[item.type] || "其他")} · ${escapeHTML(item.createdAt)}${item.reviewTime ? ` · ${escapeHTML(item.reviewTime)} 后处理` : ""}</div>
          </div>
          <span class="metric-pill">${item.done ? "已处理" : "先停住"}</span>
        </div>
        <div class="item-actions">
          ${item.done ? "" : `<button class="small-button complete-distraction" data-id="${item.id}" type="button">处理完了</button>`}
          <button class="danger-button delete-distraction" data-id="${item.id}" type="button">删除</button>
        </div>
      </article>
    `;
  }

  function renderPractice() {
    const totals = todayPracticeTotals();
    $("#practiceTodayMetric").textContent = `今日 ${totals.total} 题`;
    $("#practiceAccuracyMetric").textContent = totals.accuracy === null ? "正确率 --" : `正确率 ${totals.accuracy}%`;
    $("#practiceCount").textContent = `${state.practiceLogs.length} 组`;
    $("#practiceList").innerHTML = state.practiceLogs.length
      ? state.practiceLogs.slice(0, 10).map(renderPracticeItem).join("")
      : `<div class="empty-state">还没有刷题记录。数一、英一、408 都可以从一小组开始。</div>`;

    $$(".delete-practice").forEach((button) => {
      button.addEventListener("click", () => {
        deletePracticeLog(button.dataset.id);
      });
    });
  }

  function deletePracticeLog(id) {
    const practiceLog = state.practiceLogs.find((log) => log.id === id);
    state.practiceLogs = state.practiceLogs.filter((log) => log.id !== id);
    state.focusLogs = state.focusLogs.filter(
      (log) => log.id !== practiceLog?.focusLogId && log.practiceLogId !== id,
    );
    saveState();
    renderPractice();
    renderFocus();
    renderCountdown();
    renderWeeklyReview();
    renderMomentumCanvas();
    showToast("刷题记录已删除。");
  }

  function renderPracticeItem(log) {
    const accuracy = log.total ? Math.round((Number(log.correct || 0) / Number(log.total || 1)) * 100) : 0;
    return `
      <article class="practice-item">
        <div class="score-strip">
          <span><strong>${Number(log.total) || 0}</strong>总题数</span>
          <span><strong>${Number(log.correct) || 0}</strong>正确数</span>
          <span><strong>${accuracy}%</strong>正确率</span>
        </div>
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(log.source)}</div>
            <div class="item-meta">${escapeHTML(subjectName(log.subject))} · ${Number(log.minutes) || 0} 分钟 · ${escapeHTML(log.date)}</div>
          </div>
        </div>
        <p class="item-summary">${escapeHTML(log.note || "没有备注。下一组可以写一个最卡的点。")}</p>
        <div class="item-actions">
          <button class="danger-button delete-practice" data-id="${escapeHTML(log.id)}" type="button">删除</button>
        </div>
      </article>
    `;
  }

  function renderSentences() {
    const totals = todaySentenceTotals();
    $("#wordsTodayMetric").textContent = `今日 ${totals.count} 句`;
    $("#wordsReviewMetric").textContent = totals.hitGoal ? "今日目标已达成" : "今日还差 1 句";
    $("#wordCount").textContent = `${state.sentenceLogs.length} 句`;
    $("#wordList").innerHTML = state.sentenceLogs.length
      ? state.sentenceLogs.slice(0, 10).map(renderSentenceItem).join("")
      : `<div class="empty-state">今天还没有长难句。先留下一句，哪怕只拆主干也算接上英语一。</div>`;

    $$(".delete-sentence").forEach((button) => {
      button.addEventListener("click", () => {
        state.sentenceLogs = state.sentenceLogs.filter((log) => log.id !== button.dataset.id);
        saveState();
        renderSentences();
        renderCountdown();
        showToast("长难句记录已删除。");
      });
    });
  }

  function renderSentenceItem(log) {
    return `
      <article class="word-item">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(log.source || "长难句")}</div>
            <div class="item-meta">${escapeHTML(log.date)}</div>
          </div>
          <span class="metric-pill">1 句</span>
        </div>
        <blockquote class="sentence-text">${escapeHTML(log.sentence)}</blockquote>
        <p class="item-summary">${escapeHTML(log.analysis || "还没有拆解。下一次可以补主干、修饰、翻译或卡点。")}</p>
        ${safeImageSrc(log.screenshot) ? `<img class="sentence-shot" src="${safeImageSrc(log.screenshot)}" alt="长难句截图" loading="lazy" />` : ""}
        <div class="item-actions">
          <button class="danger-button delete-sentence" data-id="${escapeHTML(log.id)}" type="button">删除</button>
        </div>
      </article>
    `;
  }

  function renderSentenceScreenshotPreview() {
    const preview = $("#sentenceScreenshotPreview");
    if (!pendingSentenceScreenshot) {
      preview.innerHTML = "可上传题目、解析或原文截图。";
      return;
    }
    preview.innerHTML = `
      <img src="${pendingSentenceScreenshot}" alt="待保存的长难句截图" />
      <button class="small-button" id="clearSentenceScreenshot" type="button">移除截图</button>
    `;
    $("#clearSentenceScreenshot").addEventListener("click", () => {
      pendingSentenceScreenshot = "";
      $("#sentenceScreenshot").value = "";
      renderSentenceScreenshotPreview();
    });
  }

  function renderBreakSuggestion() {
    $("#breakSuggestion").textContent = breakSuggestions[breakSuggestionIndex];
  }

  function renderTimer() {
    const displaySeconds = timerState.direction === "up" ? timerState.elapsed : timerState.remaining;
    const minutes = Math.floor(displaySeconds / 60);
    const seconds = displaySeconds % 60;
    const progress =
      timerState.direction === "up"
        ? Math.round(((timerState.elapsed % 3600) / 3600) * 360)
        : Math.round(((timerState.duration - timerState.remaining) / timerState.duration) * 360);
    $("#timerMode").textContent = `${timerState.mode} · ${timerState.direction === "up" ? "正计时" : "倒计时"}`;
    $("#timerDisplay").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    $("#timerHint").textContent = timerState.running
      ? "正在专注，先别切走。"
      : timerState.direction === "up"
        ? "正计时会按实际学习时长同步到驾驶舱。"
        : `小小鱼，先游 ${Math.round(timerState.duration / 60)} 分钟。`;
    $("#timerOrb").style.setProperty("--progress", `${progress}deg`);
    $("#timerTodayMetric").textContent = `6点制今日 ${doneListSessions(studyDayISO()).length} 组计时`;
    renderPomodoroList();
    renderDoneList();
  }

  function startTimer() {
    if (timerState.running) return;
    if (!timerState.startedAt) timerState.startedAt = new Date().toISOString();
    timerState.running = true;
    renderTimer();
    timerInterval = window.setInterval(() => {
      timerState.elapsed += 1;
      if (timerState.direction === "up") {
        renderTimer();
        return;
      }
      timerState.remaining = Math.max(0, timerState.remaining - 1);
      if (timerState.remaining === 0) {
        timerState.remaining = 0;
        completePomodoro(false);
        return;
      }
      renderTimer();
    }, 1000);
  }

  function stopTimer() {
    timerState.running = false;
    if (timerInterval) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function completePomodoro() {
    const elapsed = timerState.direction === "up" ? timerState.elapsed : timerState.duration - timerState.remaining;
    if (elapsed < 1) {
      showToast("还没开始计时，先按开始。");
      return;
    }
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const logId = uid("timer");
    const timerSubject = $("#timerSubject").value;
    const isStudy = timerSubject !== nonStudySubject.id;
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - elapsed * 1000);
    stopTimer();
    if (timerState.mode !== "休息") {
      state.focusLogs.unshift({
        id: logId,
        date: toLocalISO(endedAt),
        workdayDate: studyDayISO(endedAt),
        subject: timerSubject,
        minutes,
        note: $("#timerNote").value.trim() || `${timerState.mode} ${minutes} 分钟`,
        source: "timer",
        isStudy,
        timerMode: timerState.mode,
        timerDirection: timerState.direction,
        seconds: elapsed,
        startedAt: timerState.startedAt || startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      });
    }
    timerState.remaining = timerState.duration;
    timerState.elapsed = 0;
    timerState.startedAt = null;
    saveState();
    renderTimer();
    renderFocus();
    renderCountdown();
    renderMomentumCanvas();
    showToast(
      timerState.mode === "休息"
        ? "休息结束，不计入学习时长。"
        : isStudy
          ? `已同步到驾驶舱。休息建议：${breakSuggestions[breakSuggestionIndex]}`
          : "已记录为非学习计时，会用灰色和学习记录区分。",
    );
  }

  function renderPomodoroList() {
    const sessions = timerSessions();
    $("#pomodoroCount").textContent = `${sessions.length} 组`;
    $("#pomodoroList").innerHTML = sessions.length
      ? sessions.slice(0, 10).map(renderPomodoroItem).join("")
      : `<div class="empty-state">还没有计时学习记录。按开始，先来一组。</div>`;
    bindStudyLogDeleteButtons();
  }

  function renderPomodoroItem(log) {
    const direction = log.timerDirection === "up" ? "正计时" : "倒计时";
    const isNonStudy = isNonStudyLog(log);
    return `
      <article class="pomodoro-item ${isNonStudy ? "is-non-study" : ""}">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(log.timerMode || "专注")} · ${Number(log.minutes) || 0} 分钟</div>
            <div class="item-meta">${escapeHTML(subjectName(log.subject))} · ${escapeHTML(log.date)}</div>
          </div>
          <span class="metric-pill ${isNonStudy ? "is-muted" : ""}">${isNonStudy ? "非学习" : direction}</span>
        </div>
        <p class="item-summary">${escapeHTML(log.note)}</p>
        <div class="item-actions">
          <button class="danger-button delete-study-log" data-id="${escapeHTML(log.id)}" type="button">删除记录</button>
        </div>
      </article>
    `;
  }

  function doneListSessions(dateString) {
    return timerSessions()
      .filter((log) => logStudyDay(log) === dateString)
      .sort((a, b) => logSortTime(b) - logSortTime(a));
  }

  function logSortTime(log) {
    const timestamp = log.endedAt || log.completedAt || log.startedAt;
    const date = timestamp ? new Date(timestamp) : new Date(`${log.date || todayISO()}T12:00:00`);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatLogClock(log) {
    const timestamp = log.endedAt || log.completedAt;
    if (!timestamp) return "旧记录";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "旧记录";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function renderDoneList() {
    const sessions = doneListSessions(activeDoneDate);
    const studySessions = studyLogs(sessions);
    const studyMinutes = studySessions.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const range = studyDayRange(activeDoneDate);
    $("#doneListDate").value = activeDoneDate;
    $("#doneListRange").textContent = `${activeDoneDate} 06:00 - ${formatShortDay(range.end)} 06:00`;
    $("#doneSessionCount").textContent = sessions.length;
    $("#doneMinuteCount").textContent = studyMinutes;
    $("#doneTopSubject").textContent = topBy(studySessions, "subject", subjectName) || "--";
    $("#doneListCopy").innerHTML = renderDoneListCopy(sessions, studyMinutes);
    $("#doneListBody").innerHTML = sessions.length
      ? sessions.map(renderDoneListItem).join("")
      : `<div class="empty-state">这一档还没有番茄钟完成记录。完成一颗番茄后，这里会自动长出 Done List。</div>`;
    bindStudyLogDeleteButtons();
  }

  function renderDoneListCopy(sessions, studyMinutes) {
    if (!sessions.length) {
      return `<strong>Done List 还在等第一条记录。</strong><span>06:00 到次日 06:00 算作同一天。</span>`;
    }
    const nonStudyCount = sessions.filter(isNonStudyLog).length;
    const studyCount = sessions.length - nonStudyCount;
    return `
      <strong>这一天完成 ${studyCount} 组学习番茄，累计 ${studyMinutes} 分钟。</strong>
      <span>${nonStudyCount ? `另有 ${nonStudyCount} 组非学习计时已灰色标出。` : "今天的番茄都在学习主线上。"}</span>
    `;
  }

  function renderDoneListItem(log) {
    const isNonStudy = isNonStudyLog(log);
    return `
      <article class="done-item ${isNonStudy ? "is-non-study" : ""}">
        <div class="done-check" aria-hidden="true">✓</div>
        <div class="done-main">
          <div class="done-title">${escapeHTML(log.note || "完成一组番茄")}</div>
          <div class="item-meta">${escapeHTML(formatLogClock(log))} · ${escapeHTML(subjectName(log.subject))} · ${Number(log.minutes) || 0} 分钟</div>
        </div>
        <span class="metric-pill ${isNonStudy ? "is-muted" : ""}">${isNonStudy ? "非学习" : escapeHTML(log.timerMode || "专注")}</span>
      </article>
    `;
  }

  function renderSubjectMap() {
    $("#subjectMap").innerHTML = subjects
      .map((subject) => {
        const topics = state.topicState[subject.id] || [];
        const max = topics.length * 4 || 1;
        const score = topics.reduce((sum, topic) => {
          const status = statusList.find((item) => item.id === topic.status);
          return sum + (status?.score || 0);
        }, 0);
        const percent = Math.round((score / max) * 100);
        return `
          <section class="subject-card" style="--subject-accent: ${subject.accent}" aria-label="${subject.name}">
            <div class="subject-top">
              <div>
                <p class="panel-kicker">Subject</p>
                <h3>${escapeHTML(subject.name)}</h3>
              </div>
              <span class="metric-pill">${percent}%</span>
            </div>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-fill" style="width: ${percent}%; background: ${subject.accent}"></div>
            </div>
            <div class="topic-list">
              ${topics
                .map(
                  (topic) => `
                    <div class="topic-row">
                      <div class="topic-name">${escapeHTML(topic.name)}</div>
                      <div class="status-buttons">
                        ${statusList
                          .map(
                            (status) => `
                              <button class="status-button ${topic.status === status.id ? "is-active" : ""}"
                                data-subject="${subject.id}"
                                data-topic="${topic.id}"
                                data-status="${status.id}"
                                type="button">${escapeHTML(status.label)}</button>
                            `,
                          )
                          .join("")}
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </section>
        `;
      })
      .join("");

    $$(".status-button").forEach((button) => {
      button.addEventListener("click", () => {
        const topics = state.topicState[button.dataset.subject] || [];
        const topic = topics.find((item) => item.id === button.dataset.topic);
        if (topic) topic.status = button.dataset.status;
        saveState();
        renderSubjectMap();
        renderWeeklyReview();
      });
    });
  }

  function renderMistakes() {
    const source =
      activeMistakeFilter === "due" ? state.mistakes.filter((mistake) => isDue(mistake.reviewDate)) : state.mistakes;
    $("#mistakeCount").textContent = `${source.length} 条`;
    $("#mistakeList").innerHTML = source.length
      ? source.map(renderMistakeItem).join("")
      : `<div class="empty-state">还没有错题。第一版最重要的动作：错了就记一句“为什么”。</div>`;

    $$(".delete-mistake").forEach((button) => {
      button.addEventListener("click", () => {
        state.mistakes = state.mistakes.filter((mistake) => mistake.id !== button.dataset.id);
        saveState();
        renderMistakes();
        renderWeeklyReview();
      });
    });

    $$(".review-mistake").forEach((button) => {
      button.addEventListener("click", () => {
        state.mistakes = state.mistakes.map((mistake) =>
          mistake.id === button.dataset.id ? { ...mistake, reviewDate: dateAdd(3) } : mistake,
        );
        saveState();
        renderMistakes();
        showToast("已推到 3 天后复盘。");
      });
    });
  }

  function renderMistakeItem(mistake) {
    return `
      <article class="mistake-item">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(mistake.topic)}</div>
            <div class="item-meta">${escapeHTML(subjectName(mistake.subject))} · ${escapeHTML(mistake.cause)} · ${escapeHTML(mistake.reviewDate)}</div>
          </div>
          ${isDue(mistake.reviewDate) ? `<span class="due-tag">该复习</span>` : ""}
        </div>
        <p class="item-summary">${escapeHTML(mistake.summary)}</p>
        <div class="item-actions">
          <button class="small-button review-mistake" data-id="${mistake.id}" type="button">复习过了</button>
          <button class="danger-button delete-mistake" data-id="${mistake.id}" type="button">删除</button>
        </div>
      </article>
    `;
  }

  function renderIdeas() {
    $("#ideaCount").textContent = `${state.ideas.length} 个`;
    $("#ideaList").innerHTML = state.ideas.length
      ? state.ideas.map(renderIdeaItem).join("")
      : `<div class="empty-state">突然想做的新东西先放这里。你没有失去灵感，只是把它排队。</div>`;

    $$(".delete-idea").forEach((button) => {
      button.addEventListener("click", () => {
        state.ideas = state.ideas.filter((idea) => idea.id !== button.dataset.id);
        saveState();
        renderIdeas();
      });
    });

    $$(".idea-to-task").forEach((button) => {
      button.addEventListener("click", () => {
        const idea = state.ideas.find((item) => item.id === button.dataset.id);
        if (!idea) return;
        state.tasks.unshift({
          id: uid("task"),
          level: "base",
          title: `奖励任务：${idea.text}`,
          subject: "ds",
          minutes: 30,
          detail: "只允许 30 分钟，做完回到考研主线。",
          done: false,
        });
        saveState();
        renderTasks();
        showToast("已加入今日泳池，但只给 30 分钟。");
      });
    });
  }

  function renderIdeaItem(idea) {
    return `
      <article class="idea-item">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHTML(idea.text)}</div>
            <div class="item-meta">停车于 ${escapeHTML(idea.createdAt)}</div>
          </div>
        </div>
        <p class="item-summary">${escapeHTML(idea.reason || "没有写原因，也没关系。先停车就是赢。")}</p>
        <div class="item-actions">
          <button class="small-button idea-to-task" data-id="${idea.id}" type="button">变成 30 分钟奖励任务</button>
          <button class="danger-button delete-idea" data-id="${idea.id}" type="button">删除</button>
        </div>
      </article>
    `;
  }

  function renderWeeklyReview() {
    const weekStart = startOfWeek(new Date());
    const weeklyLogs = studyLogs(
      state.focusLogs.filter((log) => new Date(`${log.date}T00:00:00`) >= weekStart),
    );
    const total = weeklyLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    $("#weekMinutes").textContent = total;
    $("#topSubject").textContent = topBy(weeklyLogs, "subject", subjectName) || "--";
    $("#topCause").textContent = topBy(state.mistakes, "cause") || "--";
    $("#nextFocus").textContent = subjectName(findWeakSubject());
    renderWeeklyAdvice(false);
  }

  function topBy(items, key, mapValue = (value) => value) {
    const counts = {};
    items.forEach((item) => {
      if (!item[key]) return;
      counts[item[key]] = (counts[item[key]] || 0) + (key === "subject" ? Number(item.minutes || 1) : 1);
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? mapValue(top[0]) : "";
  }

  function renderWeeklyAdvice(forceDetailed) {
    const due = state.mistakes.filter((mistake) => isDue(mistake.reviewDate));
    const weak = subjectName(findWeakSubject());
    const done = state.tasks.filter((task) => task.done).length;
    const ideas = state.ideas.length;
    const lines = [
      `下周只抓三个重点：${weak} 的薄弱点、${due.length || "一组"} 道到期错题、每天至少一组 25 分钟证据。`,
      done ? `本周已经有 ${done} 个任务被打勾，说明系统正在工作。继续用“保底版”保护连续性。` : "本周任务完成记录偏少。先别加计划，把每天入口降到 25 分钟。",
      ideas ? `灵感停车场里有 ${ideas} 个想法，周末挑一个做 30 分钟奖励任务，其余继续停车。` : "灵感停车场现在很清爽。状态兴奋时也先完成一项考研主线，再奖励自己。"
    ];
    if (forceDetailed) {
      lines.push("一句话版本：加油小小鱼，不用一直热血，只要每次断线后能重新接上。");
    }
    $("#weeklyAdvice").innerHTML = lines.map((line) => `<div class="advice-line">${line}</div>`).join("");
  }

  function renderMomentumCanvas() {
    const canvas = $("#momentumCanvas");
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    const logs = lastSevenDays().map((date) => ({
      date,
      minutes: state.focusLogs
        .filter((log) => log.date === date)
        .filter((log) => !isNonStudyLog(log))
        .reduce((sum, log) => sum + Number(log.minutes || 0), 0),
    }));
    const max = Math.max(60, ...logs.map((log) => log.minutes));

    context.fillStyle = "rgba(255,255,255,0.58)";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(32,120,111,0.16)";
    context.lineWidth = 1;
    for (let y = 28; y < height; y += 30) {
      context.beginPath();
      context.moveTo(20, y);
      context.lineTo(width - 20, y);
      context.stroke();
    }

    logs.forEach((log, index) => {
      const barWidth = 42;
      const gap = (width - 60 - logs.length * barWidth) / (logs.length - 1);
      const x = 30 + index * (barWidth + gap);
      const barHeight = Math.max(8, (log.minutes / max) * 112);
      const y = height - 34 - barHeight;
      context.fillStyle = index === logs.length - 1 ? "#e95d48" : "#20786f";
      roundRect(context, x, y, barWidth, barHeight, 7);
      context.fill();
      context.fillStyle = "#66726b";
      context.font = "700 12px Arial";
      context.textAlign = "center";
      context.fillText(log.date.slice(5).replace("-", "/"), x + barWidth / 2, height - 12);
    });

    context.fillStyle = "#1d2420";
    context.font = "800 15px Arial";
    context.textAlign = "left";
    context.fillText("7 日学习动能", 22, 24);
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function lastSevenDays() {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return toLocalISO(date);
    });
  }

  init();
})();
