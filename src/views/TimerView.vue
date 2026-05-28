<script setup>
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { breakSuggestions, timerSubjects } from "../constants/defaults.js";

defineOptions({ name: "TimerView" });

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

onBeforeUnmount(() => window.clearInterval(interval));
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Pomodoro</p><h2>{{ fish.t("番茄钟") }}</h2></div><div class="topbar-actions"><span class="metric-pill">{{ fish.t("今日") }} {{ fish.todayPomodoros.value }} {{ fish.t("组计时") }}</span><ExportActions :title="fish.t('番茄钟记录')" :payload="fish.state.pomodoroLogs" :rows="exportRows" /></div></div>
    <div class="timer-layout">
      <section class="panel timer-panel">
        <div class="timer-orb kitty-timer" :style="{ '--timer-progress': `${timerProgress * 360}deg` }" aria-label="Pomodoro timer">
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
            <strong>{{ display }}</strong>
            <small>{{ fish.t("小小鱼，先游一段。") }}</small>
          </div>
        </div>
        <div class="timer-direction-row">
          <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'down' }" type="button" @click="timer.direction = 'down'; reset()">{{ fish.t("倒计时") }}</button>
          <button class="timer-direction-button" :class="{ 'is-active': timer.direction === 'up' }" type="button" @click="timer.direction = 'up'; reset()">{{ fish.t("正计时") }}</button>
        </div>
        <div class="preset-row">
          <button class="preset-button" type="button" @click="setPreset(25, '专注')">25 {{ fish.t("专注") }}</button>
          <button class="preset-button" type="button" @click="setPreset(5, '休息')">5 {{ fish.t("休息") }}</button>
          <button class="preset-button" type="button" @click="setPreset(50, '深潜')">50 {{ fish.t("深潜") }}</button>
        </div>
        <div class="timer-fields">
          <label>{{ fish.t("科目") }}<select v-model="timer.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("这颗番茄做什么") }}<input v-model="timer.note" maxlength="60" /></label>
        </div>
        <div class="timer-actions">
          <button class="primary-button" type="button" @click="start">{{ fish.t("开始") }}</button>
          <button class="secondary-button" type="button" @click="pause">{{ fish.t("暂停") }}</button>
          <button class="secondary-button" type="button" @click="reset">{{ fish.t("重置") }}</button>
          <button class="small-button" type="button" @click="complete">{{ fish.t("结束并同步") }}</button>
        </div>
        <div class="timer-helper-grid">
          <section class="focus-catch"><h3>{{ fish.t("分心停车条") }}</h3><form class="quick-form" @submit.prevent="fish.addDistraction({ text: $event.target.elements.quick.value, type: 'idea', source: 'timer' }); $event.target.reset()"><input name="quick" maxlength="80" :placeholder="fish.t('脑子飘走了？先写在这里。')" /><button class="small-button">{{ fish.t("停住") }}</button></form></section>
          <section class="break-card"><h3>{{ fish.t("休息时做什么") }}</h3><p>{{ fish.t(breakSuggestions[breakIndex]) }}</p><button class="secondary-button" type="button" @click="breakIndex = (breakIndex + 1) % breakSuggestions.length">{{ fish.t("换一个") }}</button></section>
        </div>
      </section>
      <section class="panel">
        <p class="panel-kicker">Sessions</p><h3>{{ fish.t("计时学习记录") }}</h3>
        <div class="item-list"><article v-for="log in fish.state.pomodoroLogs" :key="log.id" class="list-item">
          <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
            <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in timerSubjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
            <label>{{ fish.t("分钟") }}<input v-model.number="editForm.minutes" type="number" min="1" /></label>
            <label>{{ fish.t("模式") }}<input v-model="editForm.mode" maxlength="20" /></label>
            <label class="wide-field">{{ fish.t("内容") }}<input v-model="editForm.note" maxlength="60" /></label>
            <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
          </form>
          <template v-else><div><strong>{{ fish.subjectName(log.subject) }}</strong><small>{{ log.minutes }} {{ fish.t("分钟") }} · {{ fish.tx(log.mode) }}</small><p><BilingualTextEditor :fish="fish" :value="log.note" @save="(text) => fish.updateTranslation('pomodoroLogs', log.id, 'note', text)" /></p></div><div class="row-actions"><button @click="startEdit(log)">{{ fish.t("编辑") }}</button><button @click="fish.deleteById('pomodoroLogs', log.id)">{{ fish.t("删除") }}</button></div></template>
        </article></div>
      </section>
    </div>
  </section>
</template>
