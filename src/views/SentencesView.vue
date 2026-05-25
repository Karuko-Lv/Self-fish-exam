<script setup>
import { reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ text: "", source: "", note: "", screenshot: "" });
const editingId = ref("");
const editForm = reactive({ text: "", source: "", note: "" });
const previewName = ref("");

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
  previewName.value = "";
}

function startEdit(log) {
  editingId.value = log.id;
  Object.assign(editForm, {
    text: props.fish.textSource(log.text),
    source: props.fish.textSource(log.source),
    note: props.fish.textSource(log.note),
  });
}

function saveEdit(id) {
  props.fish.updateById("sentenceLogs", id, { ...editForm });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Sentence</p><h2>{{ fish.t("长难句") }}</h2></div><div class="topbar-actions"><span class="metric-pill">{{ fish.t("今日") }} {{ fish.todaySentences.value }} {{ fish.t("句") }}</span><ExportActions :title="fish.t('长难句仓库')" :payload="fish.state.sentenceLogs" :rows="fish.state.sentenceLogs.map((log) => ({ [fish.t('日期')]: log.date, [fish.t('来源')]: fish.tx(log.source), [fish.t('原句')]: fish.tx(log.text), [fish.t('拆解')]: fish.tx(log.note) }))" /></div></div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Daily</p><h3>{{ fish.t("今天至少一句") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("原句") }}<textarea v-model="form.text" rows="5" maxlength="600" required></textarea></label>
          <label>{{ fish.t("来源") }}<input v-model="form.source" maxlength="70" /></label>
          <label>{{ fish.t("拆解 / 翻译 / 卡点") }}<textarea v-model="form.note" rows="5" maxlength="600"></textarea></label>
          <label>{{ fish.t("上传截图") }}<input type="file" accept="image/*" @change="readFile" /></label>
          <div class="screenshot-preview">{{ previewName || fish.t("可上传题目、解析或原文截图。") }}</div>
          <button class="primary-button" type="submit">{{ fish.t("保存长难句") }}</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">Archive</p><h3>{{ fish.t("长难句仓库") }}</h3>
        <div class="item-list">
          <article v-for="log in fish.state.sentenceLogs" :key="log.id" class="list-item sentence-item">
            <form v-if="editingId === log.id" class="inline-edit-form" @submit.prevent="saveEdit(log.id)">
              <label>{{ fish.t("原句") }}<textarea v-model="editForm.text" rows="4" maxlength="600" required></textarea></label>
              <label>{{ fish.t("来源") }}<input v-model="editForm.source" maxlength="70" /></label>
              <label class="wide-field">{{ fish.t("拆解 / 翻译 / 卡点") }}<textarea v-model="editForm.note" rows="4" maxlength="600"></textarea></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <div><strong><BilingualTextEditor :fish="fish" :value="log.source" @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'source', text)" />{{ fish.tx(log.source) ? '' : log.date }}</strong><p><BilingualTextEditor :fish="fish" :value="log.text" textarea @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'text', text)" /></p><small><BilingualTextEditor :fish="fish" :value="log.note" textarea @save="(text) => fish.updateTranslation('sentenceLogs', log.id, 'note', text)" /></small><img v-if="log.screenshot" :src="log.screenshot" :alt="fish.t('长难句截图')" /></div>
              <div class="row-actions"><button type="button" @click="startEdit(log)">{{ fish.t("编辑") }}</button><button type="button" @click="fish.deleteById('sentenceLogs', log.id)">{{ fish.t("删除") }}</button></div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
