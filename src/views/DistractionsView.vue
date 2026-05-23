<script setup>
import { computed, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { distractionTypes } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const filter = ref("all");
const form = reactive({ text: "", type: "idea", reviewTime: "" });
const editingId = ref("");
const editForm = reactive({ text: "", type: "idea", reviewTime: "" });
const items = computed(() => props.fish.state.distractionLogs.filter((item) => filter.value === "all" || (filter.value === "open" ? !item.done : item.done)));
const exportRows = computed(() =>
  items.value.map((item) => ({
    日期: item.date,
    内容: item.text,
    类型: distractionTypes[item.type],
    处理时间: item.reviewTime || "",
    是否处理: item.done ? "是" : "否",
  })),
);

function submit() {
  props.fish.addDistraction({ ...form });
  form.text = "";
  form.reviewTime = "";
}

function startEdit(item) {
  editingId.value = item.id;
  Object.assign(editForm, { text: item.text, type: item.type, reviewTime: item.reviewTime || "" });
}

function saveEdit(id) {
  props.fish.updateById("distractionLogs", id, { ...editForm });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Distraction Log</p><h2>分心记录</h2></div><div class="topbar-actions"><div class="filter-group"><button v-for="f in ['all','open','done']" :key="f" class="filter-chip" :class="{ 'is-active': filter === f }" @click="filter = f">{{ f === 'all' ? '全部' : f === 'open' ? '未处理' : '已处理' }}</button></div><ExportActions title="分心记录" :payload="items" :rows="exportRows" /></div></div>
    <div class="split-layout">
      <section class="panel"><p class="panel-kicker">Catch</p><h3>记录一个飘走的念头</h3><form class="stack-form" @submit.prevent="submit"><label>分心内容<input v-model="form.text" required maxlength="90" /></label><label>类型<select v-model="form.type"><option v-for="(label, id) in distractionTypes" :key="id" :value="id">{{ label }}</option></select></label><label>回头处理时间<input v-model="form.reviewTime" type="time" /></label><button class="primary-button">放到专注后</button></form></section>
      <section class="panel"><p class="panel-kicker">Queue</p><h3>先不处理队列</h3><div class="item-list"><article v-for="item in items" :key="item.id" class="list-item">
        <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
          <label>分心内容<input v-model="editForm.text" required maxlength="90" /></label>
          <label>类型<select v-model="editForm.type"><option v-for="(label, id) in distractionTypes" :key="id" :value="id">{{ label }}</option></select></label>
          <label>回头处理时间<input v-model="editForm.reviewTime" type="time" /></label>
          <div class="row-actions wide-field"><button class="primary-button">保存</button><button class="secondary-button" type="button" @click="editingId = ''">取消</button></div>
        </form>
        <template v-else><div><strong>{{ item.text }}</strong><small>{{ distractionTypes[item.type] }} · {{ item.reviewTime || '稍后' }}</small></div><div class="row-actions"><button @click="fish.toggleDistraction(item.id)">{{ item.done ? '重开' : '处理' }}</button><button @click="startEdit(item)">编辑</button><button @click="fish.deleteById('distractionLogs', item.id)">删除</button></div></template>
      </article></div></section>
    </div>
  </section>
</template>
