<script setup>
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { breakSuggestions, timerSubjects } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const timer = reactive({ mode: "专注", direction: "down", seconds: 25 * 60, remaining: 25 * 60, running: false, note: "", subject: "ds" });
const editingId = ref("");
const editForm = reactive({ subject: "ds", minutes: 25, mode: "专注", note: "" });
const breakIndex = ref(0);
let interval = null;

const display = computed(() => {
  const value = timer.direction === "down" ? timer.remaining : timer.seconds - timer.remaining;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});

const exportRows = computed(() =>
  props.fish.state.pomodoroLogs.map((log) => ({
    日期: log.date,
    科目: props.fish.subjectName(log.subject),
    分钟: log.minutes,
    模式: log.mode,
    内容: log.note,
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
  props.fish.addPomodoroLog({ subject: timer.subject, minutes, mode: timer.mode, note: timer.note });
  reset();
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, { subject: log.subject, minutes: log.minutes, mode: log.mode, note: log.note });
}

function saveEdit(id) {
  props.fish.updateById("pomodoroLogs", id, { ...editForm, minutes: Number(editForm.minutes) });
  editingId.value = "";
}

onBeforeUnmount(() => window.clearInterval(interval));
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Pomodoro</p><h2>番茄钟</h2></div><div class="topbar-actions"><span class="metric-pill">今日 {{ fish.todayPomodoros.value }} 组计时</span><ExportActions title="番茄钟记录" :payload="fish.state.pomodoroLogs" :rows="exportRows" /></div></div>
    <div class="timer-layout">
      <section class="panel timer-panel">
        <div class="timer-orb"><div class="timer-core"><span>{{ timer.mode }}</span><strong>{{ display }}</strong><small>小小鱼，先游一段。</small></div></div>
        <div class="timer-direction-row">
          <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'down' }" type="button" @click="timer.direction = 'down'; reset()">倒计时</button>
          <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'up' }" type="button" @click="timer.direction = 'up'; reset()">正计时</button>
        </div>
        <div class="preset-row">
          <button class="preset-button" type="button" @click="setPreset(25, '专注')">25 专注</button>
          <button class="preset-button" type="button" @click="setPreset(5, '休息')">5 休息</button>
          <button class="preset-button" type="button" @click="setPreset(50, '深潜')">50 深潜</button>
        </div>
        <div class="timer-fields">
          <label>科目<select v-model="timer.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <label>这颗番茄做什么<input v-model="timer.note" maxlength="60" /></label>
        </div>
        <div class="timer-actions">
          <button class="primary-button" type="button" @click="start">开始</button>
          <button class="secondary-button" type="button" @click="pause">暂停</button>
          <button class="secondary-button" type="button" @click="reset">重置</button>
          <button class="small-button" type="button" @click="complete">结束并同步</button>
        </div>
        <div class="timer-helper-grid">
          <section class="focus-catch"><h3>分心停车条</h3><form class="quick-form" @submit.prevent="fish.addDistraction({ text: $event.target.elements.quick.value, type: 'idea', source: 'timer' }); $event.target.reset()"><input name="quick" maxlength="80" placeholder="脑子飘走了？先写在这里。" /><button class="small-button">停住</button></form></section>
          <section class="break-card"><h3>休息时做什么</h3><p>{{ breakSuggestions[breakIndex] }}</p><button class="secondary-button" type="button" @click="breakIndex = (breakIndex + 1) % breakSuggestions.length">换一个</button></section>
        </div>
      </section>
      <section class="panel">
        <p class="panel-kicker">Sessions</p><h3>计时学习记录</h3>
        <div class="item-list"><article v-for="log in fish.state.pomodoroLogs" :key="log.id" class="list-item">
          <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
            <label>科目<select v-model="editForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
            <label>分钟<input v-model.number="editForm.minutes" type="number" min="1" /></label>
            <label>模式<input v-model="editForm.mode" maxlength="20" /></label>
            <label class="wide-field">内容<input v-model="editForm.note" maxlength="60" /></label>
            <div class="row-actions wide-field"><button class="primary-button">保存</button><button class="secondary-button" type="button" @click="editingId = ''">取消</button></div>
          </form>
          <template v-else><div><strong>{{ fish.subjectName(log.subject) }}</strong><small>{{ log.minutes }} 分钟 · {{ log.mode }}</small><p>{{ log.note }}</p></div><div class="row-actions"><button @click="startEdit(log)">编辑</button><button @click="fish.deleteById('pomodoroLogs', log.id)">删除</button></div></template>
        </article></div>
      </section>
    </div>
  </section>
</template>
