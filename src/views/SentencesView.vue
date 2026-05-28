<script setup>
import { computed, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ text: "", source: "", note: "", screenshot: "", words: [] });
const editingId = ref("");
const editForm = reactive({ text: "", source: "", note: "", screenshot: "", words: [] });
const previewName = ref("");
const editPreviewName = ref("");
const page = ref(1);
const pageSize = 1;
const hideWordDefs = ref(false);
const newWord = ref("");
const newWordNote = ref("");
const editNewWord = ref("");
const editNewWordNote = ref("");

function addWord() {
  const w = newWord.value.trim();
  if (!w) return;
  form.words.push({ word: w, note: newWordNote.value.trim() });
  newWord.value = "";
  newWordNote.value = "";
}

function removeWord(idx) {
  form.words.splice(idx, 1);
}

function editAddWord() {
  const w = editNewWord.value.trim();
  if (!w) return;
  editForm.words.push({ word: w, note: editNewWordNote.value.trim() });
  editNewWord.value = "";
  editNewWordNote.value = "";
}

function editRemoveWord(idx) {
  editForm.words.splice(idx, 1);
}

const totalPages = computed(() => Math.max(1, Math.ceil(props.fish.state.sentenceLogs.length / pageSize)));

const pagedLogs = computed(() => {
  const start = (page.value - 1) * pageSize;
  return props.fish.state.sentenceLogs.slice(start, start + pageSize);
});

function readFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    form.screenshot = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

function submit() {
  props.fish.addSentenceLog({ ...form });
  form.text = "";
  form.source = "";
  form.note = "";
  form.screenshot = "";
  form.words = [];
  previewName.value = "";
}

function readEditFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  editPreviewName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    editForm.screenshot = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    text: props.fish.textSource(log.text),
    source: props.fish.textSource(log.source),
    note: props.fish.textSource(log.note),
    screenshot: log.screenshot || "",
    words: (log.words || []).map((w) => ({ ...w })),
  });
  editPreviewName.value = log.screenshot ? "(已有截图)" : "";
}

function saveEdit(id) {
  props.fish.updateById("sentenceLogs", id, { ...editForm });
  editingId.value = "";
  editPreviewName.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Sentence</p><h2>{{ fish.t("长难句") }}</h2></div><div class="topbar-actions"><span class="metric-pill">{{ fish.t("今日") }} {{ fish.todaySentences.value }} {{ fish.t("句") }}</span><ExportActions :title="fish.t('长难句仓库')" :payload="props.fish.state.sentenceLogs" :rows="props.fish.state.sentenceLogs.map((log) => ({ [fish.t('日期')]: log.date, [fish.t('来源')]: fish.tx(log.source), [fish.t('原句')]: fish.tx(log.text), [fish.t('拆解')]: fish.tx(log.note) }))" /></div></div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Daily</p><h3>{{ fish.t("今天至少一句") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("原句") }}<textarea v-model="form.text" rows="5" maxlength="600" required></textarea></label>
          <label>{{ fish.t("来源") }}<input v-model="form.source" maxlength="70" /></label>
          <label>{{ fish.t("拆解 / 翻译 / 卡点") }}<textarea v-model="form.note" rows="5"></textarea></label>
          <div class="word-section">
            <p class="word-section-title">{{ fish.t("生词") }}</p>
            <div class="word-input-row">
              <input v-model="newWord" :placeholder="fish.t('单词')" maxlength="60" @keyup.enter="addWord" />
              <input v-model="newWordNote" :placeholder="fish.t('释义')" maxlength="60" @keyup.enter="addWord" />
              <button type="button" class="small-button" @click="addWord">+</button>
            </div>
            <ul v-if="form.words.length" class="vocab-list vocab-editable">
              <li v-for="(w, idx) in form.words" :key="idx" class="vocab-item"><span class="vocab-word">{{ w.word }}</span><span v-if="w.note" class="vocab-def">{{ w.note }}</span><button type="button" class="vocab-remove" @click="removeWord(idx)">&times;</button></li>
            </ul>
          </div>
          <label>{{ fish.t("上传截图") }}<input type="file" accept="image/*" @change="readFile" /></label>
          <div class="screenshot-preview">{{ previewName || fish.t("可上传题目、解析或原文截图。") }}</div>
          <button class="primary-button" type="submit">{{ fish.t("保存长难句") }}</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Archive</p>
            <h3>{{ fish.t("长难句仓库") }}</h3>
          </div>
          <button type="button" class="small-button" @click="hideWordDefs = !hideWordDefs">{{ hideWordDefs ? fish.t('显示释义') : fish.t('隐藏释义') }}</button>
        </div>
        <div class="item-list">
          <article v-for="log in pagedLogs" :key="log.id" class="list-item sentence-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("原句") }}<textarea v-model="editForm.text" rows="4" maxlength="600" required></textarea></label>
              <label>{{ fish.t("来源") }}<input v-model="editForm.source" maxlength="70" /></label>
              <label class="wide-field">{{ fish.t("拆解 / 翻译 / 卡点") }}<textarea v-model="editForm.note" rows="4"></textarea></label>
              <div class="word-section wide-field">
                <p class="word-section-title">{{ fish.t("生词") }}</p>
                <div class="word-input-row">
                  <input v-model="editNewWord" :placeholder="fish.t('单词')" maxlength="60" @keyup.enter="editAddWord" />
                  <input v-model="editNewWordNote" :placeholder="fish.t('释义')" maxlength="60" @keyup.enter="editAddWord" />
                  <button type="button" class="small-button" @click="editAddWord">+</button>
                </div>
                <ul v-if="editForm.words.length" class="vocab-list vocab-editable">
                  <li v-for="(w, idx) in editForm.words" :key="idx" class="vocab-item"><span class="vocab-word">{{ w.word }}</span><span v-if="w.note" class="vocab-def">{{ w.note }}</span><button type="button" class="vocab-remove" @click="editRemoveWord(idx)">&times;</button></li>
                </ul>
              </div>
              <label class="wide-field">{{ fish.t("上传截图") }}<input type="file" accept="image/*" @change="readEditFile" /></label>
              <div class="screenshot-preview">{{ editPreviewName || fish.t("可上传题目、解析或原文截图。") }}</div>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''; editPreviewName = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <div class="sentence-body"><strong><BilingualTextEditor :fish="fish" :value="log.source" @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'source', text)" /></strong><p><BilingualTextEditor :fish="fish" :value="log.text" textarea @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'text', text)" /></p><small><BilingualTextEditor :fish="fish" :value="log.note" textarea @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'note', text)" /></small><ul v-if="log.words?.length" class="vocab-list"><li v-for="(w, idx) in log.words" :key="idx" class="vocab-item"><span class="vocab-word">{{ w.word }}</span><span v-if="w.note && !hideWordDefs" class="vocab-def">{{ w.note }}</span></li></ul><img v-if="log.screenshot" :src="log.screenshot" :alt="fish.t('长难句截图')" /></div>
              <div class="row-actions"><button type="button" @click="startEdit(log)">{{ fish.t("编辑") }}</button><button type="button" class="is-delete" @click="fish.deleteById('sentenceLogs', log.id)">{{ fish.t("删除") }}</button></div>
            </template>
          </article>
        </div>
        <div v-if="totalPages > 1" class="paginator">
          <button class="small-button" :disabled="page <= 1" @click="page--">{{ fish.t("上一页") }}</button>
          <span class="paginator-info">{{ page }} / {{ totalPages }}</span>
          <button class="small-button" :disabled="page >= totalPages" @click="page++">{{ fish.t("下一页") }}</button>
        </div>
      </section>
    </div>
  </section>
</template>
