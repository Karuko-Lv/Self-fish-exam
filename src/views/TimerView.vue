<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { timerSubjects } from "../constants/defaults.js";
import { useStudyReminder } from "../composables/useStudyReminder.js";
import { formatShortDay, shiftISODate, startOfWeek, toLocalISO, todayISO } from "../utils/dates.js";

defineOptions({ name: "TimerView" });

const props = defineProps({ fish: { type: Object, required: true } });
const reminder = useStudyReminder(props.fish, (msg) => props.fish.notify(msg));
if (typeof window !== 'undefined') window.__testReminder = () => reminder._debugFire();
const COUNTDOWN_PRESETS = [
  { minutes: 25, mode: "专注" },
  { minutes: 5, mode: "短休息" },
  { minutes: 15, mode: "长休息" },
  { minutes: 50, mode: "深潜" },
];
const DEFAULT_COUNTDOWN_SECONDS = COUNTDOWN_PRESETS[0].minutes * 60;

const timer = reactive({
  mode: COUNTDOWN_PRESETS[0].mode,
  direction: "down",
  seconds: DEFAULT_COUNTDOWN_SECONDS,
  remaining: DEFAULT_COUNTDOWN_SECONDS,
  elapsed: 0,
  running: false,
  note: "",
  subject: "ds",
  startTime: "",
  _startTimestamp: null,
});
const editingId = ref("");
const expandedLogId = ref("");
const selectedTimelineTask = ref(null);
const selectedDate = ref(todayISO());
const viewMode = ref("day");
const showDatePicker = ref(false);
const customCountdown = reactive({ hours: "", minutes: "", seconds: "" });
const editForm = reactive({ subject: "ds", mode: "专注", note: "", startTime: "", endTime: "" });

function toggleExpand(id) {
  expandedLogId.value = expandedLogId.value === id ? "" : id;
}
const addingNew = ref(false);
const addForm = reactive({ subject: "ds", mode: "专注", note: "", startTime: "", endTime: "", date: todayISO() });
let interval = null;

const now = ref(new Date());
let clockInterval = null;
onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date(); }, 1000);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const saved = props.fish.getActiveTimer();
  restoreActiveTimer(saved);
});

function formatClockTime(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

function formatDurationText(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [];
  if (hours) parts.push(`${hours}${props.fish.t("小时")}`);
  if (minutes) parts.push(`${minutes}${props.fish.t("分钟")}`);
  if (secs || !parts.length) parts.push(`${secs}${props.fish.t("秒")}`);
  return parts.join(" ");
}

function resetRuntime() {
  timer.running = false;
  timer.elapsed = 0;
  timer.remaining = timer.direction === "down" ? timer.seconds : 0;
  timer.startTime = "";
  timer._startTimestamp = null;
  window.clearInterval(interval);
  reminder.resetBucket();
  props.fish.clearActiveTimer();
}

function configureTimer({ direction, seconds, mode }) {
  timer.direction = direction;
  timer.mode = mode;
  timer.seconds = direction === "down" ? Math.max(1, Number(seconds || 0)) : 0;
  resetRuntime();
}

function setCountUp() {
  configureTimer({ direction: "up", seconds: 0, mode: "正计时" });
}

function setCountdownPreset(preset) {
  configureTimer({ direction: "down", seconds: preset.minutes * 60, mode: preset.mode });
}

function applyCustomCountdown() {
  const hours = Math.max(0, parseInt(customCountdown.hours || "0", 10) || 0);
  const minutes = Math.max(0, parseInt(customCountdown.minutes || "0", 10) || 0);
  const seconds = Math.max(0, parseInt(customCountdown.seconds || "0", 10) || 0);
  const total = Math.min(24 * 60 * 60, hours * 3600 + minutes * 60 + seconds);
  if (!total) return;
  configureTimer({ direction: "down", seconds: total, mode: "自定义" });
  customCountdown.hours = "";
  customCountdown.minutes = "";
  customCountdown.seconds = "";
}

function getElapsedSeconds() {
  if (timer.running && timer._startTimestamp) {
    return Math.max(0, Math.floor((Date.now() - new Date(timer._startTimestamp).getTime()) / 1000));
  }
  return Math.max(0, Number(timer.elapsed || 0));
}

const elapsedSeconds = computed(() => {
  const _trigger = now.value;
  if (timer.running) return Math.max(0, Number(timer.elapsed || 0));
  return getElapsedSeconds();
});

const remainingSeconds = computed(() => {
  const _trigger = now.value;
  if (timer.direction === "up") return 0;
  return timer.seconds - elapsedSeconds.value;
});

const timerOvertime = computed(() => timer.direction === "down" && remainingSeconds.value < 0);

const timerHint = computed(() => {
  if (timer.direction === "up") {
    return props.fish.t("从零开始正计时");
  }
  if (timerOvertime.value) {
    return props.fish.t("已超时 {time}，确认结束时记录完整总时长", { time: formatDurationText(Math.abs(remainingSeconds.value)) });
  }
  return props.fish.t("设定 {time}，归零后继续正计时", { time: formatDurationText(timer.seconds) });
});

const display = computed(() => {
  const value = timer.direction === "up"
    ? elapsedSeconds.value
    : timerOvertime.value
      ? Math.abs(remainingSeconds.value)
      : Math.max(0, remainingSeconds.value);
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
});

const timerProgress = computed(() => {
  if (timer.direction === "up" || !timer.seconds) return 0;
  return Math.min(1, Math.max(0, elapsedSeconds.value / timer.seconds));
});

const exportRows = computed(() =>
  props.fish.state.pomodoroLogs.map((log) => ({
    日期: log.date,
    科目: props.fish.subjectName(log.subject),
    分钟: log.minutes,
    模式: props.fish.tx(log.mode),
    内容: props.fish.tx(log.note),
  })),
);

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    now.value = new Date();
    tickTimer();
  }
}

function saveActiveTimerSnapshot() {
  if (!timer.running && getElapsedSeconds() === 0) return;
  props.fish.saveActiveTimer({
    mode: timer.mode,
    direction: timer.direction,
    seconds: timer.seconds,
    remaining: timer.remaining,
    elapsed: getElapsedSeconds(),
    running: timer.running,
    note: timer.note,
    subject: timer.subject,
    startTime: timer.startTime,
    startTimestamp: timer._startTimestamp || null,
  });
}

function restoreActiveTimer(saved) {
  if (!saved || !saved.startTimestamp) return;

  timer.direction = saved.direction === "up" ? "up" : "down";
  timer.mode = saved.mode || (timer.direction === "up" ? "正计时" : "专注");
  timer.seconds = timer.direction === "down" ? Math.max(1, Number(saved.seconds || DEFAULT_COUNTDOWN_SECONDS)) : 0;
  timer.subject = saved.subject || "ds";
  timer.note = saved.note || "";
  timer.startTime = saved.startTime || "";
  timer._startTimestamp = saved.startTimestamp || null;

  if (saved.running) {
    const startedAt = new Date(saved.startTimestamp).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    timer.elapsed = elapsed;
    timer.remaining = timer.direction === "down" ? timer.seconds - elapsed : 0;
    timer.running = true;
    startTimerInterval();
    reminder.resetBucket();
  } else {
    timer.elapsed = Math.max(0, Number(saved.elapsed ?? (timer.direction === "down" ? timer.seconds - Number(saved.remaining ?? timer.seconds) : 0)));
    timer.remaining = timer.direction === "down" ? timer.seconds - timer.elapsed : 0;
    timer.running = false;
  }

  saveActiveTimerSnapshot();
}

function start() {
  if (timer.running) return;
  timer.running = true;
  if (!timer.startTime) timer.startTime = formatClockTime();
  const alreadyElapsed = getElapsedSeconds();
  timer._startTimestamp = new Date(Date.now() - alreadyElapsed * 1000).toISOString();
  startTimerInterval();
  reminder.resetBucket();
  saveActiveTimerSnapshot();
}

function startTimerInterval() {
  window.clearInterval(interval);
  interval = window.setInterval(tickTimer, 250);
}

function tickTimer() {
  if (!timer.running || !timer._startTimestamp) return;
  timer.elapsed = getElapsedSeconds();
  timer.remaining = timer.direction === "down" ? timer.seconds - timer.elapsed : 0;
  if (timer.mode !== "短休息" && timer.mode !== "长休息" && timer.mode !== "休息") reminder.checkReminder(timer);
}

function pause() {
  if (!timer.running) return;
  timer.elapsed = getElapsedSeconds();
  timer.remaining = timer.direction === "down" ? timer.seconds - timer.elapsed : 0;
  timer.running = false;
  window.clearInterval(interval);
  saveActiveTimerSnapshot();
}

function reset() {
  timer.running = false;
  window.clearInterval(interval);
  timer.elapsed = 0;
  timer.remaining = timer.direction === "down" ? timer.seconds : 0;
  timer._startTimestamp = null;
  timer.startTime = '';
  reminder.resetBucket();
  props.fish.clearActiveTimer();
}

function restartTimer() {
  reset();
  start();
}

function complete() {
  const elapsed = getElapsedSeconds();
  if (!elapsed) return;
  const completedAt = new Date();
  window.clearInterval(interval);
  timer.running = false;
  timer.elapsed = elapsed;
  timer.remaining = timer.direction === "down" ? timer.seconds - elapsed : 0;

  const minutes = Math.max(1, Math.ceil(elapsed / 60));
  const endTime = formatClockTime(completedAt);
  const fallbackStartTime = formatClockTime(new Date(completedAt.getTime() - elapsed * 1000));
  props.fish.addPomodoroLog({
    subject: timer.subject,
    minutes,
    mode: timer.mode,
    note: timer.note,
    startTime: timer.startTime || fallbackStartTime,
    endTime,
    date: toLocalISO(completedAt),
  });
  props.fish.notify(props.fish.t("已记录完整计时时长。"));
  reset();
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    subject: log.subject,
    mode: props.fish.textSource(log.mode),
    note: props.fish.textSource(log.note),
    startTime: (log.startTime || "").slice(0, 5),
    endTime: (log.endTime || "").slice(0, 5),
  });
}

function saveEdit(id) {
  let calcMinutes = 0;
  if (editForm.startTime && editForm.endTime) {
    const [sh, sm] = editForm.startTime.split(':').map(Number);
    const [eh, em] = editForm.endTime.split(':').map(Number);
    calcMinutes = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
  }
  props.fish.updateById("pomodoroLogs", id, { ...editForm, minutes: calcMinutes, startTime: editForm.startTime || "", endTime: editForm.endTime || "" });
  editingId.value = "";
}

function startAdd() {
  Object.assign(addForm, {
    subject: "ds",
    mode: "专注",
    note: "",
    startTime: "",
    endTime: "",
    date: todayISO(),
  });
  addingNew.value = true;
}

function submitAdd() {
  let calcMinutes = 0;
  if (addForm.startTime && addForm.endTime) {
    const [sh, sm] = addForm.startTime.split(':').map(Number);
    const [eh, em] = addForm.endTime.split(':').map(Number);
    calcMinutes = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
  }
  props.fish.addPomodoroLog({
    subject: addForm.subject,
    minutes: calcMinutes,
    mode: addForm.mode,
    note: addForm.note,
    startTime: addForm.startTime || "",
    endTime: addForm.endTime || "",
    date: addForm.date,
  });
  addingNew.value = false;
}

const analysisRange = ref("week");
const analysisStart = ref("");
const analysisEnd = ref("");
const showStudyOnly = ref(false);

const pinkPalette = ["#EA7D9D", "#F6B8CE", "#FBEAEF", "#FEF6F0", "#F5E0B5", "#FBD2D0"];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

const subjectPinkMap = computed(() => {
  const map = {};
  const subjects = Object.keys(analysisStats.value.bySubject);
  let pinkIdx = 0;
  subjects.forEach((subj) => {
    if (subj === 'nonStudy') {
      map[subj] = '#8e8e93';
    } else {
      map[subj] = pinkPalette[pinkIdx % pinkPalette.length];
      pinkIdx++;
    }
  });
  return map;
});

const subjectTransparentMap = computed(() => {
  const map = {};
  for (const [subj, color] of Object.entries(subjectPinkMap.value)) {
    const textColor = darkenHex(color, 0.35);
    map[subj] = {
      bg: hexToRgba(color, 0.22),
      border: textColor,
      text: textColor,
    };
  }
  return map;
});

const isToday = computed(() => selectedDate.value === todayISO());

const doneList = computed(() =>
  props.fish.state.pomodoroLogs
    .filter((l) => l.date === selectedDate.value),
);
const doneTotal = computed(() => doneList.value.reduce((s, l) => s + Number(l.minutes || 0), 0));

const recentTimerLogs = computed(() => {
  const start = shiftISODate(todayISO(), -1);
  const end = todayISO();
  return props.fish.state.pomodoroLogs
    .filter((log) => log.date >= start && log.date <= end)
    .sort((a, b) => {
      const dateOrder = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateOrder) return dateOrder;
      return new Date(b.createdAt || `${b.date}T00:00:00`) - new Date(a.createdAt || `${a.date}T00:00:00`);
    });
});

const weekDates = computed(() => {
  const mon = startOfWeek(new Date(selectedDate.value + "T12:00:00"));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    return toLocalISO(d);
  });
});

const weekDoneList = computed(() => {
  const set = new Set(weekDates.value);
  return props.fish.state.pomodoroLogs.filter((l) => set.has(l.date));
});

const weekGrouped = computed(() => {
  return weekDates.value.map(date => {
    const logs = weekDoneList.value.filter(l => l.date === date);
    const total = logs.reduce((s, l) => s + Number(l.minutes || 0), 0);
    return { date, logs, total };
  });
});

const weekTotal = computed(() => weekGrouped.value.reduce((s, d) => s + d.total, 0));

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PX_PER_HOUR_WEEK = 17;

const weekGrid = computed(() => {
  return weekDates.value.map((date, dayIdx) => {
    const logs = weekDoneList.value
      .filter(l => l.date === date)
      .map(l => {
        const sh = l.startTime ? parseInt(l.startTime.split(':')[0]) : 0;
        const sm = l.startTime ? parseInt(l.startTime.split(':')[1]) || 0 : 0;
        const startMin = sh * 60 + sm;
        let endMin;
        if (l.endTime) {
          const eh = parseInt(l.endTime.split(':')[0]);
          const em = parseInt(l.endTime.split(':')[1]) || 0;
          endMin = eh * 60 + em;
        } else {
          endMin = startMin + (l.minutes || 0);
        }
        const top = (startMin / 60) * PX_PER_HOUR_WEEK;
        const height = Math.max(10, ((endMin - startMin) / 60) * PX_PER_HOUR_WEEK);
        return { ...l, top, height, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
    const total = logs.reduce((s, l) => s + Number(l.minutes || 0), 0);
    return { date, logs, total };
  });
});

const doneTimeline = computed(() => {
  const logs = doneList.value;
  if (!logs.length) return { hours: [], tasks: [], totalHeight: 0 };

  const PX_PER_HOUR = 60;

  const tasks = logs.map(l => {
    const sh = l.startTime ? parseInt(l.startTime.split(':')[0]) : 0;
    const sm = l.startTime ? parseInt(l.startTime.split(':')[1]) || 0 : 0;
    const startMin = sh * 60 + sm;

    let endMin;
    if (l.endTime) {
      const eh = parseInt(l.endTime.split(':')[0]);
      const em = parseInt(l.endTime.split(':')[1]) || 0;
      endMin = eh * 60 + em;
    } else {
      endMin = startMin + (l.minutes || 0);
    }

    return { ...l, startMin, endMin };
  });

  const minStart = Math.min(...tasks.filter(t => t.startTime).map(t => t.startMin));
  const maxEnd = Math.max(...tasks.map(t => t.endMin));
  const baseMin = Math.floor((minStart - 30) / 60) * 60;
  const ceilMin = Math.ceil((maxEnd + 30) / 60) * 60;

  const hours = [];
  for (let m = baseMin; m <= ceilMin; m += 60) hours.push(m / 60);

  const withTime = tasks.filter(t => t.startTime).sort((a, b) => a.startMin - b.startMin);
  const laneEnds = [];
  const laneAssign = [];

  withTime.forEach(t => {
    let lane = laneEnds.findIndex(end => end <= t.startMin);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = Math.max(laneEnds[lane], t.endMin);
    laneAssign.push({ ...t, lane, laneCount: 0 });
  });

  const totalLanes = laneEnds.length;
  laneAssign.forEach(a => { a.laneCount = totalLanes; });

  const positioned = laneAssign.map(a => ({
    ...a,
    top: a.startMin - baseMin,
    height: Math.max(22, a.endMin - a.startMin),
    leftPct: totalLanes > 1 ? 4 + (a.lane / totalLanes) * 92 : 4,
    widthPct: totalLanes > 1 ? (1 / totalLanes) * 92 - 4 : 92,
  }));

  return {
    hours,
    tasks: positioned,
    totalHeight: ceilMin - baseMin,
  };
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const weekDayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const formattedDate = computed(() => {
  if (viewMode.value === "week") {
    const mon = weekDates.value[0];
    const sun = weekDates.value[6];
    const m = new Date(mon + "T12:00:00");
    const s = new Date(sun + "T12:00:00");
    return `${m.getMonth() + 1}.${m.getDate()} - ${s.getMonth() + 1}.${s.getDate()}`;
  }
  const d = new Date(selectedDate.value + "T12:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDayNames[d.getDay()]}`;
});

function goDay(n) {
  const step = viewMode.value === "week" ? n * 7 : n;
  selectedDate.value = shiftISODate(selectedDate.value, step);
}

const analysisFiltered = computed(() => {
  let start, end;
  if (analysisRange.value === "day") { start = todayISO(); end = todayISO(); }
  else if (analysisRange.value === "week") { start = daysAgo(6); end = todayISO(); }
  else if (analysisRange.value === "month") { start = daysAgo(29); end = todayISO(); }
  else { start = analysisStart.value || daysAgo(6); end = analysisEnd.value || todayISO(); }
  let logs = props.fish.state.pomodoroLogs.filter((l) => l.date >= start && l.date <= end);
  if (showStudyOnly.value) logs = logs.filter((l) => l.subject !== "nonStudy");
  return logs;
});

const analysisStats = computed(() => {
  const logs = analysisFiltered.value;
  const totalMin = logs.reduce((s, l) => s + Number(l.minutes || 0), 0);
  const sessions = logs.length;
  const days = new Set(logs.map((l) => l.date));
  const bySubject = {};
  logs.forEach((l) => {
    bySubject[l.subject] = (bySubject[l.subject] || 0) + Number(l.minutes || 0);
  });
  const topSubject = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0];
  const byDay = {};
  logs.forEach((l) => {
    byDay[l.date] = (byDay[l.date] || 0) + Number(l.minutes || 0);
  });
  const dailyList = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  return { totalMin, sessions, dayCount: days.size, bySubject, topSubject, dailyList };
});

onBeforeUnmount(() => { window.clearInterval(interval); window.clearInterval(clockInterval); document.removeEventListener('visibilitychange', onVisibilityChange); });
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Pomodoro</p><h2>{{ fish.t("番茄钟") }}</h2></div><div class="topbar-actions"><span class="metric-pill">{{ fish.t("今日") }} {{ fish.todayPomodoros.value }} {{ fish.t("组计时") }}</span><ExportActions :title="fish.t('番茄钟记录')" :payload="fish.state.pomodoroLogs" :rows="exportRows" /></div></div>
    <div class="timer-layout">
      <section class="panel timer-panel">
                <div class="timer-orb kitty-timer" :class="{ 'is-running': timer.running, 'is-overtime': timerOvertime }" :style="{ '--timer-progress': `${timerProgress * 360}deg` }" aria-label="Pomodoro timer">
          <div class="kitty-timer-head" aria-hidden="true">
            <span class="kitty-timer-ear kitty-timer-ear-left"></span>
            <span class="kitty-timer-ear kitty-timer-ear-right"></span>
            <span class="kitty-timer-bow kitty-timer-bow-head"></span>
            <span class="kitty-timer-eye kitty-timer-eye-left"></span>
            <span class="kitty-timer-eye kitty-timer-eye-right"></span>
            <span class="kitty-timer-nose"></span>
            <span class="kitty-timer-whisker kitty-timer-whisker-left"></span>
            <span class="kitty-timer-whisker kitty-timer-whisker-right"></span>
            <span class="kitty-timer-paw kitty-timer-paw-left"></span>
            <span class="kitty-timer-paw kitty-timer-paw-right"></span>
          </div>
          <span class="kitty-timer-bow kitty-timer-bow-center" aria-hidden="true"></span>
          <span class="kitty-timer-bow kitty-timer-bow-left" aria-hidden="true"></span>
          <span class="kitty-timer-bow kitty-timer-bow-right" aria-hidden="true"></span>
          <span class="kitty-timer-paws" aria-hidden="true"></span>
          <div class="timer-core">
            <span>{{ fish.t(timer.mode) }}</span>
            <strong class="timer-display"><em class="timer-minutes">{{ display.minutes }}</em><i class="timer-colon">:</i><em class="timer-seconds">{{ display.seconds }}</em></strong>
            <small>{{ timerHint }}</small>
          </div>
        </div>

        <div class="timer-control-bar">
          <div class="timer-direction-row">
            <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'up' }" type="button" @click="setCountUp">{{ fish.t("正计时") }}</button>
            <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'down' }" type="button" @click="setCountdownPreset(COUNTDOWN_PRESETS[0])">{{ fish.t("倒计时") }}</button>
          </div>
          <span v-if="timer.direction === 'down'" class="timer-control-divider" aria-hidden="true"></span>
          <div v-if="timer.direction === 'down'" class="preset-row">
            <button v-for="preset in COUNTDOWN_PRESETS" :key="preset.mode + preset.minutes" class="preset-button" type="button" @click="setCountdownPreset(preset)">{{ preset.minutes }}<span>{{ fish.t(preset.mode) }}</span></button>
            <div class="custom-preset custom-countdown">
              <input v-model="customCountdown.hours" type="number" min="0" max="24" inputmode="numeric" :aria-label="fish.t('小时')" :placeholder="fish.t('时')" @keyup.enter="applyCustomCountdown" />
              <input v-model="customCountdown.minutes" type="number" min="0" max="59" inputmode="numeric" :aria-label="fish.t('分钟')" :placeholder="fish.t('分')" @keyup.enter="applyCustomCountdown" />
              <input v-model="customCountdown.seconds" type="number" min="0" max="59" inputmode="numeric" :aria-label="fish.t('秒')" :placeholder="fish.t('秒')" @keyup.enter="applyCustomCountdown" />
              <button type="button" @click="applyCustomCountdown">{{ fish.t("自定义") }}</button>
            </div>
          </div>
        </div>
        <div class="timer-fields">
          <label>{{ fish.t("科目") }}<select v-model="timer.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("这颗番茄做什么") }}<input v-model="timer.note" maxlength="60" :placeholder="fish.t('写写要做什么...')" /></label>
        </div>
        <div v-if="reminder.permissionState.value === 'default'" class="notification-permission-row">
          <button class="small-button" type="button" @click="reminder.requestPermission()">{{ fish.t("开启提醒") }}</button>
          <span class="notification-permission-hint">{{ fish.t("开启浏览器通知，切到其他页面也能收到学习提醒") }}</span>
        </div>
        <div class="timer-actions">
          <button class="primary-button" type="button" @click="start">{{ fish.t("开始") }}</button>
          <button class="secondary-button" type="button" @click="pause">{{ fish.t("暂停") }}</button>
          <button class="secondary-button" type="button" @click="reset">{{ fish.t("重置") }}</button>
          <button class="small-button" type="button" @click="complete">{{ fish.t("确认结束") }}</button>
        </div>
      </section>
      <div class="timer-right-col">
        <section class="panel focus-catch-panel">
          <p class="panel-kicker">Parking</p><h3>{{ fish.t("分心停车条") }}</h3>
          <form class="quick-form" @submit.prevent="fish.addDistraction({ text: $event.target.elements.quick.value, type: 'idea', source: 'timer' }); $event.target.reset()"><input name="quick" maxlength="80" :placeholder="fish.t('脑子飘走了？先写在这里。')" /><button class="small-button">{{ fish.t("停住") }}</button></form>
        </section>
        <section class="panel donelist-panel">
          <div class="date-nav">
            <button class="date-nav-arrow" @click="goDay(-1)" :title="fish.t('前一天')">&lsaquo;</button>
            <span class="date-nav-label" @click="showDatePicker = !showDatePicker">{{ formattedDate }}</span>
            <input v-if="showDatePicker" v-model="selectedDate" type="date" class="date-nav-picker" @change="showDatePicker = false" />
            <button class="date-nav-arrow" :class="{ 'is-disabled': viewMode === 'day' && isToday }" :disabled="viewMode === 'day' && isToday" @click="goDay(1)" :title="fish.t('后一天')">&rsaquo;</button>
            <button v-if="!isToday" class="date-nav-today" @click="selectedDate = todayISO(); viewMode = 'day'">{{ fish.t("回到今天") }}</button>
          </div>
          <div class="panel-header">
            <div>
              <p class="panel-kicker">{{ isToday ? 'Today' : fish.t('回顾') }}</p>
              <h3>{{ viewMode === 'day' ? fish.t("今日完成") : fish.t("本周完成") }}<template v-if="viewMode === 'day' ? doneTotal : weekTotal"> · {{ viewMode === 'day' ? doneTotal : weekTotal }}{{ fish.t("分钟") }}</template></h3>
            </div>
            <div class="segmented-control done-view-toggle">
              <button :class="{ 'is-active': viewMode === 'day' }" @click="viewMode = 'day'">{{ fish.t("日") }}</button>
              <button :class="{ 'is-active': viewMode === 'week' }" @click="viewMode = 'week'">{{ fish.t("周") }}</button>
            </div>
          </div>
          <template v-if="viewMode === 'day'">
            <div v-if="doneTimeline.tasks.length" class="donelist-ios">
              <div class="donelist-ios-labels">
                <span v-for="h in doneTimeline.hours" :key="h" class="donelist-ios-label">{{ String(h).padStart(2, '0') }}:00</span>
              </div>
              <div class="donelist-ios-track" :style="{ height: doneTimeline.totalHeight + 'px' }">
                <div v-for="h in doneTimeline.hours" :key="h" class="donelist-ios-line" :style="{ top: (h * 60 - doneTimeline.hours[0] * 60) + 'px' }"></div>
                <div v-for="t in doneTimeline.tasks" :key="t.id" class="donelist-ios-task"
                  :class="{ 'is-selected': selectedTimelineTask?.id === t.id }"
                  :style="{
                    top: t.top + 'px',
                    height: t.height + 'px',
                    left: t.leftPct + '%',
                    width: 'calc(' + t.widthPct + '% - 6px)',
                    background: darkenHex(subjectPinkMap[t.subject] || pinkPalette[0], 0.2),
                  }"
                  @click="selectedTimelineTask = selectedTimelineTask?.id === t.id ? null : t">
                  <span class="donelist-ios-subject">{{ fish.subjectName(t.subject) }}</span>
                </div>
              </div>
            </div>
            <div v-if="selectedTimelineTask" class="timeline-detail">
              <div class="timeline-detail-header">
                <strong>{{ fish.subjectName(selectedTimelineTask.subject) }}</strong>
                <span>{{ selectedTimelineTask.startTime }}{{ selectedTimelineTask.endTime ? ' - ' + selectedTimelineTask.endTime : '' }} · {{ selectedTimelineTask.minutes }}m</span>
                <button class="timeline-detail-close" @click="selectedTimelineTask = null">&times;</button>
              </div>
              <p v-if="props.fish.tx(selectedTimelineTask.note)">{{ props.fish.tx(selectedTimelineTask.note) }}</p>
              <p v-else class="empty-note">{{ fish.t('暂无备注内容。') }}</p>
            </div>
            <p v-else-if="!doneTimeline.tasks.length" class="empty-note">{{ isToday ? fish.t("今天还没有完成番茄，开始一颗吧。") : fish.t("该天没有记录") }}</p>
          </template>
          <div v-else class="week-grid-wrap">
            <div class="week-grid-headers">
              <div class="week-grid-hour-spacer"></div>
              <div v-for="day in weekGrid" :key="day.date"
                class="week-grid-col-header"
                :class="{ 'is-today': day.date === todayISO() }">
                <span class="week-grid-col-day">{{ weekDayNames[new Date(day.date + 'T12:00:00').getDay()] }}</span>
                <span class="week-grid-col-date">{{ formatShortDay(day.date) }}</span>
                <span v-if="day.total" class="week-grid-col-total">{{ day.total }}m</span>
              </div>
            </div>
            <div class="week-grid-body">
              <div class="week-grid-hour-col">
                <div v-for="hour in HOURS" :key="hour" class="week-grid-hour">{{ String(hour).padStart(2, '0') }}:00</div>
              </div>
              <div v-for="day in weekGrid" :key="day.date"
                class="week-grid-col"
                :class="{ 'is-today': day.date === todayISO() }">
                <div class="week-grid-col-track" :style="{ height: 24 * PX_PER_HOUR_WEEK + 'px' }">
                  <div v-for="hour in HOURS" :key="hour" class="week-grid-line"></div>
                  <div v-for="log in day.logs" :key="log.id" class="week-grid-block"
                    :style="{
                      top: log.top + 'px',
                      height: Math.max(log.height, 10) + 'px',
                      background: (subjectTransparentMap[log.subject] || {}).bg || hexToRgba(pinkPalette[0], 0.22),
                      borderColor: (subjectTransparentMap[log.subject] || {}).border || pinkPalette[0],
                      color: (subjectTransparentMap[log.subject] || {}).text || pinkPalette[0],
                    }"
                    @click="selectedDate = day.date; viewMode = 'day'; selectedTimelineTask = log">
                    <span class="week-grid-block-subject">{{ fish.subjectName(log.subject) }}</span>
                    <span v-if="log.startTime && log.height > 18" class="week-grid-block-time">{{ log.startTime }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="!weekTotal" class="empty-note" style="padding:16px 0">{{ fish.t("本周暂无记录") }}</p>
          </div>
        </section>
        <section class="panel sessions-panel">
          <div class="panel-header"><div><p class="panel-kicker">Sessions</p><h3>{{ fish.t("计时学习记录") }} · {{ fish.t("近两天") }}</h3></div><button class="small-button" type="button" @click="startAdd()">+ {{ fish.t("添加记录") }}</button></div>
          <div class="item-list">
            <form v-if="addingNew" class="inline-edit-form" @submit.prevent="submitAdd()">
              <label>{{ fish.t("日期") }}<input v-model="addForm.date" type="date" /></label>
              <label>{{ fish.t("科目") }}<select v-model="addForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("模式") }}<input v-model="addForm.mode" maxlength="20" /></label>
              <label>{{ fish.t("起始时间") }}<input v-model="addForm.startTime" type="time" /></label>
              <label>{{ fish.t("终止时间") }}<input v-model="addForm.endTime" type="time" /></label>
              <label class="wide-field">{{ fish.t("内容") }}<input v-model="addForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="addingNew = false">{{ fish.t("取消") }}</button></div>
            </form>
            <article v-for="log in recentTimerLogs" :key="log.id" class="list-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("模式") }}<input v-model="editForm.mode" maxlength="20" /></label>
              <label>{{ fish.t("起始时间") }}<input v-model="editForm.startTime" type="time" /></label>
              <label>{{ fish.t("终止时间") }}<input v-model="editForm.endTime" type="time" /></label>
              <label class="wide-field">{{ fish.t("内容") }}<input v-model="editForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else><div class="timer-log-body"><strong>{{ fish.subjectName(log.subject) }}</strong><small>{{ log.date }} · <template v-if="log.startTime">{{ log.startTime }} - {{ log.endTime }} · </template>{{ log.minutes }} {{ fish.t("分钟") }}</small><p :class="{ 'log-note-clamped': expandedLogId !== log.id }"><BilingualTextEditor :fish="fish" :value="log.note" @save="(text) => fish.updateTranslation('pomodoroLogs', log.id, 'note', text)" /></p></div><div class="row-actions"><button v-if="fish.tx(log.note) && fish.tx(log.note).length > 40" class="row-expand-btn" @click="toggleExpand(log.id)">{{ expandedLogId === log.id ? fish.t('收起') : fish.t('展开') }}</button><button @click="startEdit(log)">{{ fish.t("编辑") }}</button><button class="is-delete" @click="fish.deleteById('pomodoroLogs', log.id)">{{ fish.t("删除") }}</button></div></template>
          </article>
          <p v-if="!addingNew && !recentTimerLogs.length" class="empty-note">{{ fish.t("近两天暂无计时记录") }}</p>
          </div>
        </section>
      </div>
    </div>
    <section class="panel analysis-panel">
      <div class="panel-header">
        <div>
          <p class="panel-kicker">Analysis</p>
          <h3>{{ fish.t("番茄分析") }}</h3>
        </div>
        <div class="filter-group">
          <button class="filter-chip" :class="{ 'is-active': analysisRange === 'day' }" @click="analysisRange = 'day'">{{ fish.t("日") }}</button>
          <button class="filter-chip" :class="{ 'is-active': analysisRange === 'week' }" @click="analysisRange = 'week'">{{ fish.t("周") }}</button>
          <button class="filter-chip" :class="{ 'is-active': analysisRange === 'month' }" @click="analysisRange = 'month'">{{ fish.t("月") }}</button>
          <button class="filter-chip" :class="{ 'is-active': analysisRange === 'custom' }" @click="analysisRange = 'custom'">{{ fish.t("自定义") }}</button>
        </div>
        <button class="filter-chip" :class="{ 'is-active': showStudyOnly }" @click="showStudyOnly = !showStudyOnly">{{ fish.t("学习") }}</button>
      </div>
      <div v-if="analysisRange === 'custom'" class="analysis-custom-row">
        <label>{{ fish.t("起始") }}<input v-model="analysisStart" type="date" /></label>
        <label>{{ fish.t("终止") }}<input v-model="analysisEnd" type="date" /></label>
      </div>
      <div class="analysis-hero">
        <div class="analysis-ring-area">
          <svg class="analysis-ring" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--surface-2)" stroke-width="12" />
            <template v-for="(min, subj, idx) in analysisStats.bySubject" :key="subj">
              <circle cx="80" cy="80" r="70" fill="none"
                :stroke="subjectPinkMap[subj] || pinkPalette[0]" stroke-width="12"
                stroke-linecap="round"
                :stroke-dasharray="`${analysisStats.totalMin ? (min / analysisStats.totalMin * 440) : 0} 440`"
                :stroke-dashoffset="analysisStats.totalMin ? -Object.values(analysisStats.bySubject).slice(0, idx).reduce((s,m)=>s+(m/analysisStats.totalMin*440),0) : 0"
                :style="{ transform: 'rotate(-90deg)', transformOrigin: 'center' }" />
            </template>
          </svg>
          <div class="analysis-ring-center">
            <strong>{{ analysisStats.totalMin }}</strong>
            <span>{{ fish.t("分钟") }}</span>
          </div>
        </div>
        <div class="analysis-hero-stats">
          <div class="analysis-hero-card"><em>{{ analysisStats.sessions }}</em><span>{{ fish.t("组计时") }}</span></div>
          <div class="analysis-hero-card"><em>{{ analysisStats.dayCount }}</em><span>{{ fish.t("活跃天数") }}</span></div>
          <div class="analysis-hero-card"><em>{{ analysisStats.topSubject ? fish.subjectName(analysisStats.topSubject[0]) : "--" }}</em><span>{{ fish.t("最多科目") }}</span></div>
        </div>
      </div>
      <div class="analysis-bottom-grid">
        <div class="analysis-block">
          <h4>{{ fish.t("科目分布") }}</h4>
          <div class="analysis-subject-bars">
            <div v-for="(min, subj) in analysisStats.bySubject" :key="subj" class="analysis-subject-row">
              <span class="analysis-subj-dot" :style="{ background: subjectPinkMap[subj] || pinkPalette[0] }"></span>
              <span class="analysis-subj-name">{{ fish.subjectName(subj) }}</span>
              <div class="analysis-subj-track"><div class="analysis-subj-fill" :style="{ width: analysisStats.totalMin ? (min/analysisStats.totalMin*100)+'%' : '0%', background: subjectPinkMap[subj] || pinkPalette[0] }"></div></div>
              <span class="analysis-subj-pct">{{ analysisStats.totalMin ? Math.round(min/analysisStats.totalMin*100) : 0 }}%</span>
            </div>
          </div>
        </div>
        <div v-if="analysisStats.dailyList.length" class="analysis-block">
          <h4>{{ fish.t("每日趋势") }}</h4>
          <div class="analysis-daily-bars">
            <div v-for="[date, min] in analysisStats.dailyList" :key="date" class="analysis-daily-bar-item">
              <div class="analysis-daily-fill" :style="{ height: analysisStats.maxDay ? (min/analysisStats.maxDay*100)+'%' : '0%', background: pinkPalette[0] }"></div>
              <span class="analysis-daily-date">{{ date.slice(5) }}</span>
              <span class="analysis-daily-val">{{ min }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
