<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { timerSubjects } from "../constants/defaults.js";
import { todayISO } from "../utils/dates.js";

defineOptions({ name: "TimerView" });

const props = defineProps({ fish: { type: Object, required: true } });
const timer = reactive({ mode: "专注", direction: "down", seconds: 25 * 60, remaining: 25 * 60, running: false, note: "", subject: "ds", startTime: "" });
const editingId = ref("");
const expandedLogId = ref("");
const selectedTimelineTask = ref(null);
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
  if (!saved || !saved.startTimestamp) return;

  timer.mode = saved.mode;
  timer.direction = saved.direction;
  timer.seconds = saved.seconds;
  timer.subject = saved.subject;
  timer.note = saved.note || '';
  timer.startTime = saved.startTime || '';
  timer._startTimestamp = saved.startTimestamp || null;

  if (saved.running) {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(saved.startTimestamp).getTime()) / 1000));
    timer.remaining = saved.seconds - elapsed;
    if (saved.direction === 'down' && timer.remaining <= 0) {
      timer.remaining = 0;
      timer.running = false;
      showTimeoutDialog.value = true;
      props.fish.clearActiveTimer();
      return;
    }
    timer.running = true;
    interval = window.setInterval(() => {
      if (!timer._startTimestamp) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(timer._startTimestamp).getTime()) / 1000));
      if (timer.direction === 'down') {
        timer.remaining = Math.max(0, timer.seconds - elapsed);
        if (timer.remaining <= 0) complete();
      } else {
        timer.remaining = timer.seconds - elapsed;
      }
    }, 250);
  } else {
    timer.remaining = saved.remaining;
    timer.running = false;
  }

  saveActiveTimerSnapshot();
});

const display = computed(() => {
  const _trigger = now.value;
  let value;
  if (timer.running && timer._startTimestamp) {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(timer._startTimestamp).getTime()) / 1000));
    value = timer.direction === "down" ? Math.max(0, timer.seconds - elapsed) : elapsed;
  } else {
    value = timer.direction === "down" ? timer.remaining : Math.max(0, timer.seconds - timer.remaining);
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
});

const timerProgress = computed(() => {
  if (!timer.seconds) return 0;
  return Math.min(1, Math.max(0, (timer.seconds - timer.remaining) / timer.seconds));
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

const showTimeoutDialog = ref(false);

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    now.value = new Date();
  }
}

function saveActiveTimerSnapshot() {
  if (!timer.running && timer.remaining === timer.seconds) return;
  props.fish.saveActiveTimer({
    mode: timer.mode,
    direction: timer.direction,
    seconds: timer.seconds,
    remaining: timer.remaining,
    running: timer.running,
    note: timer.note,
    subject: timer.subject,
    startTime: timer.startTime,
    startTimestamp: timer._startTimestamp || null,
  });
}

function setPreset(minutes, mode) {
  timer.mode = mode;
  timer.seconds = minutes * 60;
  timer.remaining = timer.seconds;
  timer.running = false;
  timer._startTimestamp = null;
  window.clearInterval(interval);
  props.fish.clearActiveTimer();
}

function start() {
  if (timer.running) return;
  timer.running = true;
  timer.startTime = new Date().toTimeString().slice(0, 8);
  const alreadyElapsed = timer.seconds - timer.remaining;
  timer._startTimestamp = new Date(Date.now() - alreadyElapsed * 1000).toISOString();
  interval = window.setInterval(() => {
    if (!timer._startTimestamp) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(timer._startTimestamp).getTime()) / 1000));
    if (timer.direction === "down") {
      timer.remaining = Math.max(0, timer.seconds - elapsed);
      if (timer.remaining <= 0) complete();
    } else {
      timer.remaining = timer.seconds - elapsed;
    }
  }, 250);
  saveActiveTimerSnapshot();
}

function pause() {
  timer.running = false;
  window.clearInterval(interval);
  saveActiveTimerSnapshot();
}

function reset() {
  pause();
  timer.remaining = timer.seconds;
  saveActiveTimerSnapshot();
}

function complete() {
  const minutes = Math.max(1, Math.round((timer.seconds - Math.max(timer.remaining, 0)) / 60));
  const endTime = new Date().toTimeString().slice(0, 8);
  props.fish.addPomodoroLog({ subject: timer.subject, minutes, mode: timer.mode, note: timer.note, startTime: timer.startTime, endTime });
  reset();
  props.fish.clearActiveTimer();
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

function confirmTimeoutComplete() {
  const minutes = Math.max(1, Math.round(timer.seconds / 60));
  const endTime = new Date().toTimeString().slice(0, 8);
  props.fish.addPomodoroLog({
    subject: timer.subject, minutes, mode: timer.mode,
    note: timer.note, startTime: timer.startTime, endTime,
  });
  showTimeoutDialog.value = false;
  timer.remaining = timer.seconds;
  timer._startTimestamp = null;
}

function discardTimeout() {
  showTimeoutDialog.value = false;
  timer.remaining = timer.seconds;
  timer._startTimestamp = null;
}

const analysisRange = ref("week");
const analysisStart = ref("");
const analysisEnd = ref("");
const showStudyOnly = ref(false);

const pinkPalette = ["#E56A75", "#C84C5F", "#FFBBC0", "#F4A6A8", "#FECBD1", "#FFDDCA", "#AAC1B1", "#C44339", "#661F26"];

const subjectPinkMap = computed(() => {
  const map = {};
  const subjects = Object.keys(analysisStats.value.bySubject);
  subjects.forEach((subj, idx) => {
    map[subj] = pinkPalette[idx % pinkPalette.length];
  });
  return map;
});

const todayDoneList = computed(() =>
  props.fish.state.pomodoroLogs
    .filter((l) => l.date === todayISO()),
);
const todayDoneTotal = computed(() => todayDoneList.value.reduce((s, l) => s + Number(l.minutes || 0), 0));

const todayTimeline = computed(() => {
  const logs = todayDoneList.value;
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
    height: Math.max(18, a.endMin - a.startMin),
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
                <div class="timer-orb kitty-timer" :class="{ 'is-running': timer.running }" :style="{ '--timer-progress': `${timerProgress * 360}deg` }" aria-label="Pomodoro timer">
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
            <small>{{ fish.t("小小鱼，先游一段。") }}</small>
          </div>
        </div>

        <div class="timer-control-bar">
          <div class="timer-direction-row">
            <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'down' }" type="button" @click="timer.direction = 'down'; reset()">{{ fish.t("倒计时") }}</button>
            <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'up' }" type="button" @click="timer.direction = 'up'; reset()">{{ fish.t("正计时") }}</button>
          </div>
          <span class="timer-control-divider" aria-hidden="true"></span>
          <div class="preset-row">
            <button class="preset-button" type="button" @click="setPreset(25, '专注')">25<span>{{ fish.t("专注") }}</span></button>
            <button class="preset-button" type="button" @click="setPreset(5, '休息')">5<span>{{ fish.t("休息") }}</span></button>
            <button class="preset-button" type="button" @click="setPreset(50, '深潜')">50<span>{{ fish.t("深潜") }}</span></button>
          </div>
        </div>
        <div class="timer-fields">
          <label>{{ fish.t("科目") }}<select v-model="timer.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("这颗番茄做什么") }}<input v-model="timer.note" maxlength="60" :placeholder="fish.t('写写要做什么...')" /></label>
        </div>
        <div class="timer-actions">
          <button class="primary-button" type="button" @click="start">{{ fish.t("开始") }}</button>
          <button class="secondary-button" type="button" @click="pause">{{ fish.t("暂停") }}</button>
          <button class="secondary-button" type="button" @click="reset">{{ fish.t("重置") }}</button>
          <button class="small-button" type="button" @click="complete">{{ fish.t("结束并同步") }}</button>
        </div>
        <div v-if="showTimeoutDialog" class="timeout-overlay">
          <div class="timeout-dialog">
            <p>{{ fish.t("计时器已在您离开期间完成。") }}</p>
            <div class="timeout-dialog-actions">
              <button class="primary-button" type="button" @click="confirmTimeoutComplete">{{ fish.t("确认完成") }}</button>
              <button class="secondary-button" type="button" @click="discardTimeout">{{ fish.t("放弃本次") }}</button>
            </div>
          </div>
        </div>
      </section>
      <div class="timer-right-col">
        <section class="panel focus-catch-panel">
          <p class="panel-kicker">Parking</p><h3>{{ fish.t("分心停车条") }}</h3>
          <form class="quick-form" @submit.prevent="fish.addDistraction({ text: $event.target.elements.quick.value, type: 'idea', source: 'timer' }); $event.target.reset()"><input name="quick" maxlength="80" :placeholder="fish.t('脑子飘走了？先写在这里。')" /><button class="small-button">{{ fish.t("停住") }}</button></form>
        </section>
        <section class="panel donelist-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Today</p>
              <h3>{{ fish.t("今日完成") }}<template v-if="todayDoneTotal"> · {{ todayDoneTotal }}{{ fish.t("分钟") }}</template></h3>
            </div>
          </div>
          <div v-if="todayTimeline.tasks.length" class="donelist-ios">
            <div class="donelist-ios-labels">
              <span v-for="h in todayTimeline.hours" :key="h" class="donelist-ios-label">{{ String(h).padStart(2, '0') }}:00</span>
            </div>
            <div class="donelist-ios-track" :style="{ height: todayTimeline.totalHeight + 'px' }">
              <div v-for="h in todayTimeline.hours" :key="h" class="donelist-ios-line" :style="{ top: (h * 60 - todayTimeline.hours[0] * 60) + 'px' }"></div>
              <div v-for="t in todayTimeline.tasks" :key="t.id" class="donelist-ios-task"
                :class="{ 'is-selected': selectedTimelineTask?.id === t.id }"
                :style="{
                  top: t.top + 'px',
                  height: t.height + 'px',
                  left: t.leftPct + '%',
                  width: 'calc(' + t.widthPct + '% - 6px)',
                  background: subjectPinkMap[t.subject] || pinkPalette[0],
                }"
                @click="selectedTimelineTask = selectedTimelineTask?.id === t.id ? null : t">
                <span class="donelist-ios-subject">{{ fish.subjectName(t.subject) }}</span>
                <span v-if="props.fish.tx(t.note)" class="donelist-ios-note">{{ props.fish.tx(t.note) }}</span>
                <span class="donelist-ios-time">{{ t.startTime }}{{ t.endTime ? ' - ' + t.endTime : '' }} · {{ t.minutes }}m</span>
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
          <p v-else-if="!todayTimeline.tasks.length" class="empty-note">{{ fish.t("今天还没有完成番茄，开始一颗吧。") }}</p>
        </section>
        <section class="panel sessions-panel">
          <div class="panel-header"><div><p class="panel-kicker">Sessions</p><h3>{{ fish.t("计时学习记录") }}</h3></div><button class="small-button" type="button" @click="startAdd()">+ {{ fish.t("添加记录") }}</button></div>
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
            <article v-for="log in fish.state.pomodoroLogs" :key="log.id" class="list-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("模式") }}<input v-model="editForm.mode" maxlength="20" /></label>
              <label>{{ fish.t("起始时间") }}<input v-model="editForm.startTime" type="time" /></label>
              <label>{{ fish.t("终止时间") }}<input v-model="editForm.endTime" type="time" /></label>
              <label class="wide-field">{{ fish.t("内容") }}<input v-model="editForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else><div class="timer-log-body"><strong>{{ fish.subjectName(log.subject) }}</strong><small><template v-if="log.startTime">{{ log.startTime }} - {{ log.endTime }} · </template>{{ log.minutes }} {{ fish.t("分钟") }}</small><p :class="{ 'log-note-clamped': expandedLogId !== log.id }"><BilingualTextEditor :fish="fish" :value="log.note" @save="(text) => fish.updateTranslation('pomodoroLogs', log.id, 'note', text)" /></p></div><div class="row-actions"><button v-if="fish.tx(log.note) && fish.tx(log.note).length > 40" class="row-expand-btn" @click="toggleExpand(log.id)">{{ expandedLogId === log.id ? fish.t('收起') : fish.t('展开') }}</button><button @click="startEdit(log)">{{ fish.t("编辑") }}</button><button class="is-delete" @click="fish.deleteById('pomodoroLogs', log.id)">{{ fish.t("删除") }}</button></div></template>
          </article></div>
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
