<script setup>
import { computed, reactive } from "vue";
import { daysUntil } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ title: "", date: "", todosText: "" });
const events = computed(() => [...props.fish.state.countdownEvents].sort((a, b) => new Date(a.date) - new Date(b.date)));

function submit() {
  const todos = form.todosText
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));
  props.fish.addCountdown({ title: form.title, date: form.date, todos });
  form.title = "";
  form.date = "";
  form.todosText = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Important Days</p><h2>倒数日</h2></div><span class="metric-pill">{{ events.length }} 个日子</span></div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Add</p><h3>新增倒数日</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>事件名称<input v-model="form.title" maxlength="50" required /></label>
          <label>日期<input v-model="form.date" type="date" required /></label>
          <label>Todo list<textarea v-model="form.todosText" rows="5" maxlength="260" placeholder="每行一条，例如：&#10;完成英语阅读复盘&#10;整理本周错题"></textarea></label>
          <button class="primary-button" type="submit">保存倒数日</button>
        </form>
        <p class="prompt-chip">{{ fish.promptFor('countdown') }}</p>
      </section>
      <section class="panel">
        <p class="panel-kicker">Timeline</p><h3>重要日子</h3>
        <div class="item-list">
          <article v-for="event in events" :key="event.id" class="list-item countdown-item">
            <div>
              <strong>{{ event.title }}</strong>
              <small>{{ event.date }} · {{ daysUntil(event.date) }} 天</small>
              <div class="todo-list" v-if="event.todos?.length">
                <label v-for="todo in event.todos" :key="todo.id" class="todo-check">
                  <input type="checkbox" :checked="todo.done" @change="fish.toggleCountdownTodo(event.id, todo.id)" />
                  <span>{{ todo.text }}</span>
                </label>
              </div>
              <p v-else class="empty-note">这个节点还没有 todo。</p>
            </div>
            <button type="button" @click="fish.deleteById('countdownEvents', event.id)">删除</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
