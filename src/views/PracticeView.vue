<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { subjects } from "../constants/defaults.js";
import { buildPracticeExportRows } from "../utils/practiceExport.js";
import { handleBoldKeydown } from "../utils/textFormat.js";

const props = defineProps({ fish: { type: Object, required: true } });
const MAX_PHOTO_WIDTH = 800;

const form = reactive({ subject: "math1", source: "", total: 10, correct: 7, minutes: 30, note: "" });
const formPhotos = ref([]);
const editingId = ref("");
const subjectFilter = ref("");
const practicePage = ref(1);
const practicePageSize = 2;
const editForm = reactive({ subject: "math1", source: "", total: 10, correct: 7, minutes: 30, note: "" });
const editPhotos = ref([]);
const photoIndex = ref({});

const filteredLogs = computed(() => {
  if (!subjectFilter.value) return props.fish.state.practiceLogs;
  return props.fish.state.practiceLogs.filter(log => log.subject === subjectFilter.value);
});
const accuracy = computed(() => {
  const total = props.fish.state.practiceLogs.reduce((sum, log) => sum + Number(log.total || 0), 0);
  const correct = props.fish.state.practiceLogs.reduce((sum, log) => sum + Number(log.correct || 0), 0);
  return total ? `${Math.round((correct / total) * 100)}%` : "--";
});
const exportRows = computed(() => buildPracticeExportRows(filteredLogs.value, props.fish));
const practiceTotalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / practicePageSize)));
const pagedPracticeLogs = computed(() => {
  const page = Math.min(practicePage.value, practiceTotalPages.value);
  const start = (page - 1) * practicePageSize;
  return filteredLogs.value.slice(start, start + practicePageSize);
});

watch(subjectFilter, () => {
  practicePage.value = 1;
});

watch(
  () => filteredLogs.value.length,
  () => {
    practicePage.value = Math.min(Math.max(practicePage.value, 1), practiceTotalPages.value);
  },
);

function setPracticePage(page) {
  practicePage.value = Math.min(Math.max(page, 1), practiceTotalPages.value);
}

function resizePhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= MAX_PHOTO_WIDTH) {
          resolve(reader.result);
          return;
        }
        const ratio = MAX_PHOTO_WIDTH / img.width;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_PHOTO_WIDTH;
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(event, target) {
  const files = event.target.files;
  if (!files.length) return;
  const photos = target === 'form' ? formPhotos : editPhotos;
  for (const file of files) {
    const dataUrl = await resizePhoto(file);
    photos.value.push(dataUrl);
  }
  event.target.value = '';
}

function removePhoto(index, target) {
  const photos = target === 'form' ? formPhotos : editPhotos;
  photos.value.splice(index, 1);
}

function submit() {
  props.fish.addPracticeLog({ ...form, photos: [...formPhotos.value] });
  form.source = "";
  form.note = "";
  formPhotos.value = [];
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    subject: log.subject,
    source: props.fish.textSource(log.source),
    total: log.total,
    correct: log.correct,
    minutes: log.minutes,
    note: props.fish.textSource(log.note),
  });
  editPhotos.value = [...(log.photos || [])];
}

function saveEdit(id) {
  try {
    props.fish.updateById("practiceLogs", id, { ...editForm, photos: [...editPhotos.value] });
    editingId.value = "";
  } catch (e) {
    console.error("saveEdit failed", e);
  }
}

function currentPhotoIdx(logId) {
  return photoIndex.value[logId] || 0;
}

function setPhotoIdx(logId, idx) {
  photoIndex.value = { ...photoIndex.value, [logId]: idx };
}

function nextPhoto(log) {
  const max = (log.photos || []).length - 1;
  const cur = currentPhotoIdx(log.id);
  setPhotoIdx(log.id, cur < max ? cur + 1 : 0);
}

function prevPhoto(log) {
  const max = (log.photos || []).length - 1;
  const cur = currentPhotoIdx(log.id);
  setPhotoIdx(log.id, cur > 0 ? cur - 1 : max);
}

const stopwatchSeconds = ref(0);
const stopwatchRunning = ref(false);
let stopwatchInterval = null;

const stopwatchDisplay = computed(() => {
  const m = Math.floor(stopwatchSeconds.value / 60);
  const s = stopwatchSeconds.value % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function toggleStopwatch() {
  if (stopwatchRunning.value) {
    stopwatchRunning.value = false;
    clearInterval(stopwatchInterval);
    form.minutes = Math.max(1, Math.ceil(stopwatchSeconds.value / 60));
  } else {
    stopwatchRunning.value = true;
    stopwatchInterval = setInterval(() => { stopwatchSeconds.value++; }, 1000);
  }
}

function resetStopwatch() {
  stopwatchRunning.value = false;
  clearInterval(stopwatchInterval);
  stopwatchSeconds.value = 0;
}

onBeforeUnmount(() => clearInterval(stopwatchInterval));
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Practice</p><h2>{{ fish.t("刷题记录") }}</h2></div><div class="practice-metrics"><span class="metric-pill">{{ fish.t("今日") }} {{ fish.todayPractice.value }} {{ fish.t("题") }}</span><span class="metric-pill">{{ fish.t("正确率") }} {{ accuracy }}</span><ExportActions :title="fish.t('最近刷题记录')" :payload="filteredLogs" :rows="exportRows" /></div></div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Log</p><h3>{{ fish.t("新增一组刷题") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("科目") }}<select v-model="form.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("题源") }}<input v-model="form.source" required maxlength="50" /></label>
          <div class="form-grid-3">
            <label>{{ fish.t("总题数") }}<input v-model.number="form.total" type="number" min="1" /></label>
            <label>{{ fish.t("正确数") }}<input v-model.number="form.correct" type="number" min="0" /></label>
            <label>{{ fish.t("分钟") }}<input v-model.number="form.minutes" type="number" min="1" /></label>
          </div>
          <div class="stopwatch-row">
            <span class="stopwatch-display">{{ stopwatchDisplay }}</span>
            <button class="primary-button stopwatch-btn" type="button" @click="toggleStopwatch">{{ stopwatchRunning ? fish.t('暂停') : fish.t('开始') }}</button>
            <button class="secondary-button stopwatch-btn" type="button" @click="resetStopwatch">{{ fish.t('重置') }}</button>
          </div>
          <label>{{ fish.t("刷题记录") }}<textarea v-model="form.note" rows="4" @keydown="handleBoldKeydown"></textarea></label>
          <label class="photo-upload-label">
            {{ fish.t("题目照片") }}
            <input type="file" accept="image/*" multiple @change="(e) => handlePhotoUpload(e, 'form')" class="photo-file-input" />
            <span class="photo-upload-hint">{{ fish.t("可上传多张，自动压缩") }}</span>
          </label>
          <div v-if="formPhotos.length" class="photo-thumbs">
            <div v-for="(p, i) in formPhotos" :key="i" class="photo-thumb-item">
              <img :src="p" alt="" />
              <button type="button" class="photo-remove-btn" @click="removePhoto(i, 'form')">&times;</button>
            </div>
          </div>
          <button class="primary-button" type="submit">{{ fish.t("记录刷题") }}</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">History</p><h3>{{ fish.t("最近刷题") }}</h3>
        <div class="filter-row">
          <select v-model="subjectFilter">
            <option value="">{{ fish.t("全部科目") }}</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option>
          </select>
        </div>
        <div class="item-list">
          <article v-for="log in pagedPracticeLogs" :key="log.id" class="list-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("科目") }}<select v-model="editForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("题源") }}<input v-model="editForm.source" required maxlength="50" /></label>
              <label>{{ fish.t("总题数") }}<input v-model.number="editForm.total" type="number" min="1" /></label>
              <label>{{ fish.t("正确数") }}<input v-model.number="editForm.correct" type="number" min="0" /></label>
              <label>{{ fish.t("分钟") }}<input v-model.number="editForm.minutes" type="number" min="1" /></label>
              <label class="wide-field">{{ fish.t("刷题记录") }}<textarea v-model="editForm.note" rows="3" @keydown="handleBoldKeydown"></textarea></label>
              <label class="wide-field photo-upload-label">
                {{ fish.t("题目照片") }}
                <input type="file" accept="image/*" multiple @change="(e) => handlePhotoUpload(e, 'edit')" class="photo-file-input" />
              </label>
              <div v-if="editPhotos.length" class="photo-thumbs wide-field">
                <div v-for="(p, i) in editPhotos" :key="i" class="photo-thumb-item">
                  <img :src="p" alt="" />
                  <button type="button" class="photo-remove-btn" @click="removePhoto(i, 'edit')">&times;</button>
                </div>
              </div>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <div>
                <strong><BilingualTextEditor :fish="fish" :value="log.source" @save="(text) => fish.updateTranslation('practiceLogs', log.id, 'source', text)" /></strong>
                <small>{{ fish.subjectName(log.subject) }} · {{ log.correct }}/{{ log.total }} · {{ log.minutes }} {{ fish.t("分钟") }}</small>
                <p><BilingualTextEditor :fish="fish" :value="log.note" textarea @save="(text) => fish.updateTranslation('practiceLogs', log.id, 'note', text)" v-slot="{ text }"><span v-html="fish.renderBold(text)"></span></BilingualTextEditor></p>
                <div v-if="log.photos && log.photos.length" class="photo-carousel">
                  <button type="button" class="carousel-arrow carousel-prev" @click="prevPhoto(log)">&#8249;</button>
                  <div class="carousel-viewport">
                    <img :src="log.photos[currentPhotoIdx(log.id)]" :alt="fish.t('题目照片')" />
                    <span class="carousel-page">{{ currentPhotoIdx(log.id) + 1 }} / {{ log.photos.length }}</span>
                  </div>
                  <button type="button" class="carousel-arrow carousel-next" @click="nextPhoto(log)">&#8250;</button>
                </div>
              </div>
              <div class="row-actions"><button type="button" @click="startEdit(log)">{{ fish.t("编辑") }}</button><button type="button" class="is-delete" @click="fish.deleteById('practiceLogs', log.id)">{{ fish.t("删除") }}</button></div>
            </template>
          </article>
          <p v-if="!filteredLogs.length" class="empty-note">{{ fish.t("暂无记录") }}</p>
        </div>
        <div v-if="filteredLogs.length > practicePageSize" class="paginator">
          <button class="small-button" type="button" :disabled="practicePage <= 1" @click="setPracticePage(practicePage - 1)">
            {{ fish.t("上一页") }}
          </button>
          <span class="paginator-info">{{ fish.t("第 {page} 页", { page: practicePage }) }} / {{ practiceTotalPages }}</span>
          <button class="small-button" type="button" :disabled="practicePage >= practiceTotalPages" @click="setPracticePage(practicePage + 1)">
            {{ fish.t("下一页") }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
