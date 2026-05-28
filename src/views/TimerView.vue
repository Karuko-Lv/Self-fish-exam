<script setup>
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { timerSubjects } from "../constants/defaults.js";
import { todayISO } from "../utils/dates.js";

defineOptions({ name: "TimerView" });

const props = defineProps({ fish: { type: Object, required: true } });
const timer = reactive({ mode: "专注", direction: "down", seconds: 25 * 60, remaining: 25 * 60, running: false, note: "", subject: "ds", startTime: "" });
const editingId = ref("");
const editForm = reactive({ subject: "ds", minutes: 25, mode: "专注", note: "" });
let interval = null;

const display = computed(() => {
  const value = timer.direction === "down" ? timer.remaining : timer.seconds - timer.remaining;
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

function setPreset(minutes, mode) {
  timer.mode = mode;
  timer.seconds = minutes * 60;
  timer.remaining = timer.seconds;
  timer.running = false;
  window.clearInterval(interval);
}

function start() {
  if (timer.running) return;
  timer.running = true;
  timer.startTime = new Date().toTimeString().slice(0, 8);
  interval = window.setInterval(() => {
    if (timer.direction === "down") {
      timer.remaining = Math.max(0, timer.remaining - 1);
      if (timer.remaining === 0) complete();
    } else {
      timer.remaining -= 1;
    }
  }, 1000);
}

function pause() {
  timer.running = false;
  window.clearInterval(interval);
}

function reset() {
  pause();
  timer.remaining = timer.seconds;
}

function complete() {
  const minutes = Math.max(1, Math.round((timer.seconds - Math.max(timer.remaining, 0)) / 60));
  const endTime = new Date().toTimeString().slice(0, 8);
  props.fish.addPomodoroLog({ subject: timer.subject, minutes, mode: timer.mode, note: timer.note, startTime: timer.startTime, endTime });
  reset();
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    subject: log.subject,
    minutes: log.minutes,
    mode: props.fish.textSource(log.mode),
    note: props.fish.textSource(log.note),
  });
}

function saveEdit(id) {
  props.fish.updateById("pomodoroLogs", id, { ...editForm, minutes: Number(editForm.minutes) });
  editingId.value = "";
}

const analysisRange = ref("week");
const analysisStart = ref("");
const analysisEnd = ref("");

const pinkPalette = ["#ff4f8f", "#c63470", "#ff9dbc", "#8f1a4d", "#e07098", "#f5a3c0", "#b82a5e"];

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
  const slots = [];
  const hours = logs.filter(l => l.startTime).map(l => parseInt(l.startTime.split(':')[0]));
  const startHour = hours.length ? Math.min(...hours) - 1 : 6;
  const endHour = hours.length ? Math.max(...hours) + 1 : 22;
  for (let h = Math.max(6, startHour); h <= Math.min(23, endHour); h++) {
    const hourLogs = logs.filter(l => l.startTime && parseInt(l.startTime.split(':')[0]) === h);
    slots.push({ hour: h, logs: hourLogs });
  }
  return slots;
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
  return props.fish.state.pomodoroLogs.filter((l) => l.date >= start && l.date <= end);
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

onBeforeUnmount(() => window.clearInterval(interval));
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
          <div v-if="todayTimeline.length" class="donelist">
            <div v-for="slot in todayTimeline" :key="slot.hour" class="donelist-hour">
              <span class="donelist-time">{{ String(slot.hour).padStart(2, '0') }}:00</span>
              <div class="donelist-hour-line"></div>
              <div class="donelist-hour-items">
                <div v-for="log in slot.logs" :key="log.id" class="donelist-item">
                  <span class="donelist-dot" :style="{ background: subjectPinkMap[log.subject] || pinkPalette[0] }"></span>
                  <div class="donelist-body">
                    <span class="donelist-subject">{{ fish.subjectName(log.subject) }}</span>
                    <span v-if="props.fish.tx(log.note)" class="donelist-note">{{ props.fish.tx(log.note) }}</span>
                  </div>
                  <div class="donelist-meta">
                    <span v-if="log.startTime" class="donelist-time-label">{{ log.startTime }}</span>
                    <span class="donelist-minutes">{{ log.minutes }}m</span>
                  </div>
                </div>
                <span v-if="!slot.logs.length" class="donelist-empty-slot"></span>
              </div>
            </div>
          </div>
          <p v-else class="empty-note">{{ fish.t("今天还没有完成番茄，开始一颗吧。") }}</p>
        </section>
        <section class="panel sessions-panel">
          <p class="panel-kicker">Sessions</p><h3>{{ fish.t("计时学习记录") }}</h3>
          <div class="item-list"><article v-for="log in fish.state.pomodoroLogs" :key="log.id" class="list-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("分钟") }}<input v-model.number="editForm.minutes" type="number" min="1" /></label>
              <label>{{ fish.t("模式") }}<input v-model="editForm.mode" maxlength="20" /></label>
              <label class="wide-field">{{ fish.t("内容") }}<input v-model="editForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else><div><strong>{{ fish.subjectName(log.subject) }}</strong><small><template v-if="log.startTime">{{ log.startTime }} - {{ log.endTime }} · </template>{{ log.minutes }} {{ fish.t("分钟") }}</small><p><BilingualTextEditor :fish="fish" :value="log.note" @save="(text) => fish.updateTranslation('pomodoroLogs', log.id, 'note', text)" /></p></div><div class="row-actions"><button @click="startEdit(log)">{{ fish.t("编辑") }}</button><button @click="fish.deleteById('pomodoroLogs', log.id)">{{ fish.t("删除") }}</button></div></template>
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
