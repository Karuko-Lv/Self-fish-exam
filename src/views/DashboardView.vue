<script setup>
import { computed, reactive } from "vue";
import { moods, subjects } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const focusForm = reactive({ subject: "ds", minutes: 25, note: "" });

const nextCountdown = computed(() =>
  [...props.fish.state.countdownEvents]
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0],
);

function submitFocus() {
  props.fish.addFocusLog({
    subject: focusForm.subject,
    minutes: Number(focusForm.minutes),
    note: focusForm.note,
  });
  focusForm.note = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Today</p>
        <h2>今日泳池 · 还有 <span>{{ fish.daysLeft.value }}</span> 天</h2>
      </div>
      <label class="date-box">
        目标日期
        <input :value="fish.state.examDate" type="date" @input="fish.setExamDate($event.target.value)" />
      </label>
    </div>

    <div class="dashboard-grid">
      <section class="panel hero-panel">
        <p class="panel-kicker">距离目标</p>
        <div class="countdown"><strong>{{ fish.daysLeft.value }}</strong><span>天</span></div>
        <p class="daily-line">{{ fish.promptFor('dashboard') }}</p>
        <div class="hero-stats">
          <div><strong>{{ fish.todayPractice.value }}</strong><span>今日刷题</span></div>
          <div><strong>{{ fish.todaySentences.value }}</strong><span>今日长难句</span></div>
          <div><strong>{{ fish.todayPomodoros.value }}</strong><span>番茄钟</span></div>
          <div><strong>{{ fish.todayDistractions.value }}</strong><span>今日分心</span></div>
        </div>
        <div v-if="nextCountdown" class="next-card">
          <strong>{{ nextCountdown.title }}</strong>
          <span>{{ nextCountdown.date }}</span>
          <ul class="todo-preview-list" v-if="nextCountdown.todos?.length">
            <li v-for="todo in nextCountdown.todos.slice(0, 3)" :key="todo.id" :class="{ done: todo.done }">
              {{ todo.text }}
            </li>
          </ul>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">State</p>
            <h3>现在的你</h3>
          </div>
          <button class="icon-button" type="button" @click="fish.resetDailyTasks">↻</button>
        </div>
        <div class="mood-grid">
          <button
            v-for="mood in moods"
            :key="mood.id"
            class="mood-card"
            :class="{ 'is-active': fish.state.selectedMood === mood.id }"
            type="button"
            @click="fish.selectMood(mood.id)"
          >
            <strong>{{ mood.title }}</strong>
            <span>{{ mood.desc }}</span>
          </button>
        </div>
        <p class="recommend-box">
          {{ moods.find((mood) => mood.id === fish.state.selectedMood)?.advice || "先选一个状态，系统会把任务门槛调到合适的位置。" }}
        </p>
        <p class="prompt-chip">{{ fish.promptFor('practice') }}</p>
      </section>

      <section class="panel tasks-panel">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Plan</p>
            <h3>三档任务</h3>
          </div>
          <button class="primary-button" type="button" @click="fish.applyMoodTasks">状态匹配</button>
        </div>
        <div class="task-list">
          <label v-for="task in fish.state.tasks" :key="task.id" class="task-row">
            <input type="checkbox" :checked="task.done" @change="fish.toggleTask(task.id)" />
            <span>
              <strong>{{ task.title }}</strong>
              <small>{{ fish.subjectName(task.subject) }} · {{ task.minutes }} 分钟 · {{ task.detail }}</small>
            </span>
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Focus</p>
            <h3>记一组学习</h3>
          </div>
          <span class="metric-pill">{{ fish.todayMinutes.value }} 分钟</span>
        </div>
        <form class="compact-form" @submit.prevent="submitFocus">
          <label>科目<select v-model="focusForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <label>分钟<input v-model.number="focusForm.minutes" type="number" min="5" step="5" /></label>
          <label class="wide-field">做了什么<input v-model="focusForm.note" maxlength="60" placeholder="例：数据结构树的遍历错题" /></label>
          <button class="primary-button wide-button" type="submit">记录</button>
        </form>
        <div class="mini-list">
          <article v-for="log in fish.state.focusLogs.slice(0, 5)" :key="log.id">
            <span>{{ fish.subjectName(log.subject) }} · {{ log.minutes }} 分钟</span>
            <button type="button" @click="fish.deleteById('focusLogs', log.id)">删除</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
