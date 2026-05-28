<script setup>
import { reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ text: "", reason: "" });
const editingId = ref("");
const editForm = reactive({ text: "", reason: "" });

function submit() {
  props.fish.addIdea({ ...form });
  form.text = "";
  form.reason = "";
}

function startEdit(idea) {
  editingId.value = idea.id;
  Object.assign(editForm, { text: props.fish.textSource(idea.text), reason: props.fish.textSource(idea.reason) });
}

function saveEdit(id) {
  props.fish.updateById("ideas", id, { ...editForm });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Parking</p><h2>{{ fish.t("灵感停车场") }}</h2></div><ExportActions :title="fish.t('灵感停车场')" :payload="fish.state.ideas" :rows="fish.state.ideas.map((idea) => ({ [fish.t('日期')]: idea.date, [fish.t('灵感')]: fish.tx(idea.text), [fish.t('原因')]: fish.tx(idea.reason), [fish.t('状态')]: idea.parked ? fish.t('停车中') : fish.t('已转任务') }))" /></div>
    <div class="split-layout">
      <section class="panel"><p class="panel-kicker">Capture</p><h3>{{ fish.t("先停一下") }}</h3><form class="stack-form" @submit.prevent="submit"><label>{{ fish.t("我突然想做") }}<input v-model="form.text" required maxlength="70" /></label><label>{{ fish.t("为什么吸引我") }}<textarea v-model="form.reason" rows="4" maxlength="160"></textarea></label><button class="primary-button">{{ fish.t("停车") }}</button></form></section>
      <section class="panel"><p class="panel-kicker">Ideas</p><h3>{{ fish.t("等周末再审") }}</h3><div class="item-list"><article v-for="idea in fish.state.ideas" :key="idea.id" class="list-item">
        <form v-if="editingId === idea.id" class="inline-edit-form" @submit.prevent="saveEdit(idea.id)">
          <label>{{ fish.t("我突然想做") }}<input v-model="editForm.text" required maxlength="70" /></label>
          <label class="wide-field">{{ fish.t("为什么吸引我") }}<textarea v-model="editForm.reason" rows="4" maxlength="160"></textarea></label>
          <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button></div>
        </form>
        <template v-else><div><strong><BilingualTextEditor :fish="fish" :value="idea.text" @save="(text) => fish.updateTranslation('ideas', idea.id, 'text', text)" /></strong><small>{{ idea.date }} · {{ idea.parked ? fish.t('停车中') : fish.t('已转任务') }}</small><p><BilingualTextEditor :fish="fish" :value="idea.reason" textarea @save="(text) => fish.updateTranslation('ideas', idea.id, 'reason', text)" /></p></div><div class="row-actions"><button @click="fish.convertIdeaToTask(idea.id)">{{ fish.t("转任务") }}</button><button @click="startEdit(idea)">{{ fish.t("编辑") }}</button><button class="is-delete" @click="fish.deleteById('ideas', idea.id)">{{ fish.t("删除") }}</button></div></template>
      </article></div></section>
    </div>
  </section>
</template>
