<script setup>
import { computed, reactive } from "vue";
import { daysUntil } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ title: "", date: "", note: "" });
const events = computed(() => [...props.fish.state.countdownEvents].sort((a, b) => new Date(a.date) - new Date(b.date)));

function submit() {
  props.fish.addCountdown({ ...form });
  form.title = "";
  form.date = "";
  form.note = "";
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
          <label>小备注<textarea v-model="form.note" rows="4" maxlength="150"></textarea></label>
          <button class="primary-button" type="submit">保存倒数日</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">Timeline</p><h3>重要日子</h3>
        <div class="item-list">
          <article v-for="event in events" :key="event.id" class="list-item">
            <div><strong>{{ event.title }}</strong><small>{{ event.date }} · {{ daysUntil(event.date) }} 天</small><p>{{ event.note }}</p></div>
            <button type="button" @click="fish.deleteById('countdownEvents', event.id)">删除</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
