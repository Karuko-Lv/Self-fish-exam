<script setup>
import { computed, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { daysUntil } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ title: "", date: "", todosText: "" });
const editingId = ref("");
const editForm = reactive({ title: "", date: "", todosText: "" });
const events = computed(() => [...props.fish.state.countdownEvents].sort((a, b) => new Date(a.date) - new Date(b.date)));
const exportRows = computed(() =>
  events.value.map((event) => ({
    [props.fish.t("事件")]: props.fish.tx(event.title),
    [props.fish.t("日期")]: event.date,
    [props.fish.t("剩余天数")]: daysUntil(event.date),
    Todo: event.todos?.map((todo) => `${todo.done ? "[x]" : "[ ]"} ${props.fish.tx(todo.text)}`).join("\n") || "",
  })),
);

function countdownTone(date) {
  const days = daysUntil(date);
  if (days <= 14) return "is-urgent";
  if (days <= 60) return "is-near";
  if (days <= 180) return "is-mid";
  return "is-far";
}

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
  editForm.title = props.fish.textSource(event.title);
  editForm.date = event.date;
  editForm.todosText = (event.todos || []).map((todo) => `${todo.done ? "[x] " : ""}${props.fish.textSource(todo.text)}`).join("\n");
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
      <div><p class="eyebrow">Important Days</p><h2>{{ fish.t("倒数日") }}</h2></div>
      <div class="topbar-actions"><span class="metric-pill">{{ events.length }} {{ fish.t("个日子") }}</span><ExportActions :title="fish.t('倒数日')" :payload="events" :rows="exportRows" /></div>
    </div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Add</p><h3>{{ fish.t("新增倒数日") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("事件名称") }}<input v-model="form.title" maxlength="50" required /></label>
          <label>{{ fish.t("日期") }}<input v-model="form.date" type="date" required /></label>
          <label>Todo list<textarea v-model="form.todosText" rows="5" maxlength="260" :placeholder="fish.t('每行一条，例如：\n完成英语阅读复盘\n整理本周错题')"></textarea></label>
          <button class="primary-button" type="submit">{{ fish.t("保存倒数日") }}</button>
        </form>
        <p class="prompt-chip">{{ fish.promptFor('countdown') }}</p>
      </section>
      <section class="panel">
        <p class="panel-kicker">Timeline</p><h3>{{ fish.t("重要日子") }}</h3>
        <div class="item-list">
          <article v-for="event in events" :key="event.id" class="list-item countdown-item">
            <form v-if="editingId === event.id" class="inline-edit-form" @submit.prevent="saveEdit(event.id)">
              <label>{{ fish.t("事件名称") }}<input v-model="editForm.title" maxlength="50" required /></label>
              <label>{{ fish.t("日期") }}<input v-model="editForm.date" type="date" required /></label>
              <label class="wide-field">Todo list<textarea v-model="editForm.todosText" rows="5" maxlength="320"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <div class="countdown-display">
                <div class="countdown-main">
                  <strong class="countdown-title">
                    <BilingualTextEditor
                      :fish="fish"
                      :value="event.title"
                      @save="(text) => fish.updateTranslation('countdownEvents', event.id, 'title', text)"
                    />
                  </strong>
                  <small class="countdown-date">{{ event.date }}</small>
                  <div class="todo-list" v-if="event.todos?.length">
                    <label v-for="todo in event.todos" :key="todo.id" class="todo-check">
                      <input type="checkbox" :checked="todo.done" @change="fish.toggleCountdownTodo(event.id, todo.id)" />
                      <BilingualTextEditor
                        :fish="fish"
                        :value="todo.text"
                        @save="(text) => fish.updateCountdownTodoTranslation(event.id, todo.id, text)"
                      />
                    </label>
                  </div>
                  <p v-else class="empty-note">{{ fish.t("这个节点还没有 todo。") }}</p>
                </div>
                <div class="countdown-days" :class="countdownTone(event.date)">
                  <strong class="countdown-days-number">{{ daysUntil(event.date) }}</strong>
                  <span class="countdown-days-unit">{{ fish.t("天") }}</span>
                </div>
              </div>
              <div class="row-actions countdown-actions"><button type="button" @click="startEdit(event)">{{ fish.t("编辑") }}</button><button type="button" class="is-delete" @click="fish.deleteById('countdownEvents', event.id)">{{ fish.t("删除") }}</button></div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
