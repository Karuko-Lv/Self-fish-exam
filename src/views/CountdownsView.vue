<script setup>
import { computed, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { daysUntil } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ title: "", date: "", todosText: "" });
const editingId = ref("");
const editForm = reactive({ title: "", date: "", todosText: "" });
const events = computed(() => [...props.fish.state.countdownEvents].sort((a, b) => new Date(a.date) - new Date(b.date)));
const exportRows = computed(() =>
  events.value.map((event) => ({
    事件: event.title,
    日期: event.date,
    剩余天数: daysUntil(event.date),
    Todo: event.todos?.map((todo) => `${todo.done ? "[x]" : "[ ]"} ${todo.text}`).join("\n") || "",
  })),
);

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

function startEdit(event) {
  editingId.value = event.id;
  editForm.title = event.title;
  editForm.date = event.date;
  editForm.todosText = (event.todos || []).map((todo) => `${todo.done ? "[x] " : ""}${todo.text}`).join("\n");
}

function parseTodos(text, eventId) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `${eventId}-todo-${index}`,
      done: line.startsWith("[x]") || line.startsWith("[X]"),
      text: line.replace(/^\[[ xX]\]\s*/, ""),
    }));
}

function saveEdit(eventId) {
  props.fish.updateCountdown(eventId, {
    title: editForm.title,
    date: editForm.date,
    todos: parseTodos(editForm.todosText, eventId),
  });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div><p class="eyebrow">Important Days</p><h2>倒数日</h2></div>
      <div class="topbar-actions"><span class="metric-pill">{{ events.length }} 个日子</span><ExportActions title="倒数日" :payload="events" :rows="exportRows" /></div>
    </div>
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
            <form v-if="editingId === event.id" class="inline-edit-form" @submit.prevent="saveEdit(event.id)">
              <label>事件名称<input v-model="editForm.title" maxlength="50" required /></label>
              <label>日期<input v-model="editForm.date" type="date" required /></label>
              <label class="wide-field">Todo list<textarea v-model="editForm.todosText" rows="5" maxlength="320"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">保存</button><button class="secondary-button" type="button" @click="editingId = ''">取消</button></div>
            </form>
            <div v-else>
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
            <div v-if="editingId !== event.id" class="row-actions"><button type="button" @click="startEdit(event)">编辑</button><button type="button" @click="fish.deleteById('countdownEvents', event.id)">删除</button></div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
