<script setup>
import { computed, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { knowledgeReviewCauses, subjects } from "../constants/defaults.js";
import { todayISO } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const filter = ref("all");
const editingId = ref("");
const form = reactive({ subject: "ds", topic: "", cause: knowledgeReviewCauses[0], reviewDate: todayISO(), summary: "" });
const editForm = reactive({ subject: "ds", topic: "", cause: knowledgeReviewCauses[0], reviewDate: todayISO(), summary: "" });

const items = computed(() =>
  props.fish.state.knowledgeReviews.filter((item) => filter.value === "all" || item.reviewDate <= todayISO()),
);

const exportRows = computed(() =>
  items.value.map((item) => ({
    科目: props.fish.subjectName(item.subject),
    知识点: item.topic,
    卡点: item.cause,
    下次复习: item.reviewDate,
    是否复盘: item.reviewed ? "是" : "否",
    复盘记录: item.summary,
  })),
);

function submit() {
  props.fish.addKnowledgeReview({ ...form });
  form.topic = "";
  form.summary = "";
}

function startEdit(item) {
  editingId.value = item.id;
  Object.assign(editForm, {
    subject: item.subject,
    topic: item.topic,
    cause: item.cause,
    reviewDate: item.reviewDate,
    summary: item.summary,
  });
}

function saveEdit(id) {
  props.fish.updateById("knowledgeReviews", id, { ...editForm });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div><p class="eyebrow">Review</p><h2>知识点复盘中心</h2></div>
      <div class="topbar-actions">
        <div class="filter-group">
          <button class="filter-chip" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">全部</button>
          <button class="filter-chip" :class="{ 'is-active': filter === 'due' }" @click="filter = 'due'">该复习</button>
        </div>
        <ExportActions title="知识点复盘中心" :payload="items" :rows="exportRows" />
      </div>
    </div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Capture</p><h3>新增知识点</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>科目<select v-model="form.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <label>知识点<input v-model="form.topic" required maxlength="40" /></label>
          <label>卡点<select v-model="form.cause"><option v-for="cause in knowledgeReviewCauses" :key="cause">{{ cause }}</option></select></label>
          <label>下次复习<input v-model="form.reviewDate" type="date" required /></label>
          <label>一句话复盘<textarea v-model="form.summary" rows="4" required maxlength="180"></textarea></label>
          <button class="primary-button">放进复盘池</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">Queue</p><h3>复盘队列</h3>
        <div class="item-list">
          <article v-for="item in items" :key="item.id" class="list-item">
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <label>科目<select v-model="editForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
              <label>知识点<input v-model="editForm.topic" required maxlength="40" /></label>
              <label>卡点<select v-model="editForm.cause"><option v-for="cause in knowledgeReviewCauses" :key="cause">{{ cause }}</option></select></label>
              <label>下次复习<input v-model="editForm.reviewDate" type="date" required /></label>
              <label class="wide-field">复盘记录<textarea v-model="editForm.summary" rows="3" maxlength="180"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">保存</button><button class="secondary-button" type="button" @click="editingId = ''">取消</button></div>
            </form>
            <template v-else>
              <div><strong>{{ item.topic }}</strong><small>{{ fish.subjectName(item.subject) }} · {{ item.cause }} · {{ item.reviewDate }}</small><p>{{ item.summary }}</p></div>
              <div class="row-actions">
                <button @click="fish.toggleKnowledgeReviewReviewed(item.id)">{{ item.reviewed ? '取消' : '已复盘' }}</button>
                <button @click="startEdit(item)">编辑</button>
                <button @click="fish.deleteById('knowledgeReviews', item.id)">删除</button>
              </div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
