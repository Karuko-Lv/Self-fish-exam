<script setup>
import { computed, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { subjects } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ subject: "math1", source: "", total: 10, correct: 7, minutes: 30, note: "" });
const editingId = ref("");
const editForm = reactive({ subject: "math1", source: "", total: 10, correct: 7, minutes: 30, note: "" });
const accuracy = computed(() => {
  const total = props.fish.state.practiceLogs.reduce((sum, log) => sum + Number(log.total || 0), 0);
  const correct = props.fish.state.practiceLogs.reduce((sum, log) => sum + Number(log.correct || 0), 0);
  return total ? `${Math.round((correct / total) * 100)}%` : "--";
});
const exportRows = computed(() =>
  props.fish.state.practiceLogs.map((log) => ({
    日期: log.date,
    科目: props.fish.subjectName(log.subject),
    题源: log.source,
    总题数: log.total,
    正确数: log.correct,
    分钟: log.minutes,
    备注: log.note,
  })),
);

function submit() {
  props.fish.addPracticeLog({ ...form });
  form.source = "";
  form.note = "";
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    subject: log.subject,
    source: log.source,
    total: log.total,
    correct: log.correct,
    minutes: log.minutes,
    note: log.note,
  });
}

function saveEdit(id) {
  props.fish.updateById("practiceLogs", id, { ...editForm });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Practice</p><h2>刷题记录</h2></div><div class="practice-metrics"><span class="metric-pill">今日 {{ fish.todayPractice.value }} 题</span><span class="metric-pill">正确率 {{ accuracy }}</span><ExportActions title="刷题记录" :payload="fish.state.practiceLogs" :rows="exportRows" /></div></div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Log</p><h3>新增一组刷题</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>科目<select v-model="form.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <label>题源<input v-model="form.source" required maxlength="50" /></label>
          <div class="form-grid-3">
            <label>总题数<input v-model.number="form.total" type="number" min="1" /></label>
            <label>正确数<input v-model.number="form.correct" type="number" min="0" /></label>
            <label>分钟<input v-model.number="form.minutes" type="number" min="5" step="5" /></label>
          </div>
          <label>一句话记录<textarea v-model="form.note" rows="4" maxlength="180"></textarea></label>
          <button class="primary-button" type="submit">记录刷题</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">History</p><h3>最近刷题</h3>
        <div class="item-list">
          <article v-for="log in fish.state.practiceLogs" :key="log.id" class="list-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>科目<select v-model="editForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
              <label>题源<input v-model="editForm.source" required maxlength="50" /></label>
              <label>总题数<input v-model.number="editForm.total" type="number" min="1" /></label>
              <label>正确数<input v-model.number="editForm.correct" type="number" min="0" /></label>
              <label>分钟<input v-model.number="editForm.minutes" type="number" min="5" step="5" /></label>
              <label class="wide-field">备注<textarea v-model="editForm.note" rows="3" maxlength="180"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">保存</button><button class="secondary-button" type="button" @click="editingId = ''">取消</button></div>
            </form>
            <template v-else>
              <div><strong>{{ log.source }}</strong><small>{{ fish.subjectName(log.subject) }} · {{ log.correct }}/{{ log.total }} · {{ log.minutes }} 分钟</small><p>{{ log.note }}</p></div>
              <div class="row-actions"><button type="button" @click="startEdit(log)">编辑</button><button type="button" @click="fish.deleteById('practiceLogs', log.id)">删除</button></div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
