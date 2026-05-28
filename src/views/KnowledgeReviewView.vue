<script setup>
import { computed, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { examFrequencyOptions, knowledgeReviewCauses, subjects } from "../constants/defaults.js";
import { todayISO } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const filter = ref("all");
const filterSubject = ref("");
const filterFreq = ref("");
const editingId = ref("");
const form = reactive({ subject: "ds", topic: "", cause: knowledgeReviewCauses[0], frequency: "", reviewDate: todayISO(), summary: "" });
const editForm = reactive({ subject: "ds", topic: "", cause: knowledgeReviewCauses[0], frequency: "", reviewDate: todayISO(), summary: "" });

const items = computed(() => {
  let list = props.fish.state.knowledgeReviews;
  if (filter.value === "due") list = list.filter((item) => item.reviewDate <= todayISO());
  if (filterSubject.value) list = list.filter((item) => item.subject === filterSubject.value);
  if (filterFreq.value) list = list.filter((item) => item.frequency === filterFreq.value);
  return list;
});

const exportRows = computed(() =>
  items.value.map((item) => ({
    科目: props.fish.subjectName(item.subject),
    知识点: props.fish.tx(item.topic),
    卡点: props.fish.t(item.cause),
    考频: item.frequency ? props.fish.t(item.frequency) : "--",
    下次复习: item.reviewDate,
    是否复盘: item.reviewed ? props.fish.t("是") : props.fish.t("否"),
    复盘记录: props.fish.tx(item.summary),
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
    topic: props.fish.textSource(item.topic),
    cause: item.cause,
    frequency: item.frequency || "",
    reviewDate: item.reviewDate,
    summary: props.fish.textSource(item.summary),
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
      <div><p class="eyebrow">Review</p><h2>{{ fish.t("知识点复盘中心") }}</h2></div>
      <div class="topbar-actions">
        <ExportActions :title="fish.t('知识点复盘中心')" :payload="items" :rows="exportRows" />
      </div>
    </div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Capture</p><h3>{{ fish.t("新增知识点") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("科目") }}<select v-model="form.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("知识点") }}<input v-model="form.topic" required maxlength="40" /></label>
          <label>{{ fish.t("卡点") }}<select v-model="form.cause"><option v-for="cause in knowledgeReviewCauses" :key="cause">{{ fish.t(cause) }}</option></select></label>
          <label>{{ fish.t("考频") }}<select v-model="form.frequency"><option value="">{{ fish.t("不选") }}</option><option v-for="f in examFrequencyOptions" :key="f" :value="f">{{ fish.t(f) }}</option></select></label>
          <label>{{ fish.t("下次复习") }}<input v-model="form.reviewDate" type="date" required /></label>
          <label>{{ fish.t("一句话复盘") }}<textarea v-model="form.summary" rows="4" required maxlength="180"></textarea></label>
          <button class="primary-button">{{ fish.t("放进复盘池") }}</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">Queue</p>
        <div class="panel-header">
          <h3>{{ fish.t("复盘队列") }}</h3>
        </div>
        <div class="filter-row">
          <div class="filter-group">
            <button class="filter-chip" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">{{ fish.t("全部") }}</button>
            <button class="filter-chip" :class="{ 'is-active': filter === 'due' }" @click="filter = 'due'">{{ fish.t("该复习") }}</button>
          </div>
          <select v-model="filterSubject" class="filter-select">
            <option value="">{{ fish.t("全部科目") }}</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option>
          </select>
          <select v-model="filterFreq" class="filter-select">
            <option value="">{{ fish.t("全部考频") }}</option>
            <option v-for="f in examFrequencyOptions" :key="f" :value="f">{{ fish.t(f) }}</option>
          </select>
        </div>
        <div class="item-list">
          <article v-for="item in items" :key="item.id" class="list-item">
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("知识点") }}<input v-model="editForm.topic" required maxlength="40" /></label>
              <label>{{ fish.t("卡点") }}<select v-model="editForm.cause"><option v-for="cause in knowledgeReviewCauses" :key="cause">{{ fish.t(cause) }}</option></select></label>
              <label>{{ fish.t("考频") }}<select v-model="editForm.frequency"><option value="">{{ fish.t("不选") }}</option><option v-for="f in examFrequencyOptions" :key="f" :value="f">{{ fish.t(f) }}</option></select></label>
              <label>{{ fish.t("下次复习") }}<input v-model="editForm.reviewDate" type="date" required /></label>
              <label class="wide-field">{{ fish.t("复盘记录") }}<textarea v-model="editForm.summary" rows="3" maxlength="180"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <div><strong><BilingualTextEditor :fish="fish" :value="item.topic" @save="(text) => fish.updateTranslation('knowledgeReviews', item.id, 'topic', text)" /></strong><small class="knowledge-meta"><span>{{ fish.subjectName(item.subject) }} · {{ fish.t(item.cause) }} · {{ item.reviewDate }}</span><span v-if="item.frequency" class="freq-tag" :class="'freq-' + item.frequency">{{ fish.t(item.frequency) }}</span></small><p><BilingualTextEditor :fish="fish" :value="item.summary" textarea @save="(text) => fish.updateTranslation('knowledgeReviews', item.id, 'summary', text)" /></p></div>
              <div class="row-actions">
                <button @click="fish.toggleKnowledgeReviewReviewed(item.id)">{{ item.reviewed ? fish.t('取消') : fish.t('已复盘') }}</button>
                <button @click="startEdit(item)">{{ fish.t("编辑") }}</button>
                <button @click="fish.deleteById('knowledgeReviews', item.id)">{{ fish.t("删除") }}</button>
              </div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
