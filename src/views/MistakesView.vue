<script setup>
import { computed, reactive, ref } from "vue";
import { mistakeCauses, subjects } from "../constants/defaults.js";
import { todayISO } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const filter = ref("all");
const form = reactive({ subject: "ds", topic: "", cause: mistakeCauses[0], reviewDate: todayISO(), summary: "" });
const items = computed(() => props.fish.state.mistakes.filter((item) => filter.value === "all" || item.reviewDate <= todayISO()));

function submit() {
  props.fish.addMistake({ ...form });
  form.topic = "";
  form.summary = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Review</p><h2>错题复盘中心</h2></div><div class="filter-group"><button class="filter-chip" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">全部</button><button class="filter-chip" :class="{ 'is-active': filter === 'due' }" @click="filter = 'due'">该复习</button></div></div>
    <div class="split-layout">
      <section class="panel"><p class="panel-kicker">Capture</p><h3>新增错题</h3><form class="stack-form" @submit.prevent="submit"><label>科目<select v-model="form.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label><label>知识点<input v-model="form.topic" required maxlength="40" /></label><label>错因<select v-model="form.cause"><option v-for="cause in mistakeCauses" :key="cause">{{ cause }}</option></select></label><label>下次复习<input v-model="form.reviewDate" type="date" required /></label><label>一句话复盘<textarea v-model="form.summary" rows="4" required maxlength="180"></textarea></label><button class="primary-button">放进复盘池</button></form></section>
      <section class="panel"><p class="panel-kicker">Queue</p><h3>复盘队列</h3><div class="item-list"><article v-for="item in items" :key="item.id" class="list-item"><div><strong>{{ item.topic }}</strong><small>{{ fish.subjectName(item.subject) }} · {{ item.cause }} · {{ item.reviewDate }}</small><p>{{ item.summary }}</p></div><div class="row-actions"><button @click="fish.toggleMistakeReviewed(item.id)">{{ item.reviewed ? '取消' : '已复盘' }}</button><button @click="fish.deleteById('mistakes', item.id)">删除</button></div></article></div></section>
    </div>
  </section>
</template>
