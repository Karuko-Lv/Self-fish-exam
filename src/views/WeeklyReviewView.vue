<script setup>
import { computed } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { parseImportedState } from "../utils/state.js";

const props = defineProps({ fish: { type: Object, required: true } });

const exportRows = computed(() => [
  { [props.fish.t("指标")]: props.fish.t("本周有效分钟"), [props.fish.t("值")]: props.fish.weekStats.value.minutes },
  { [props.fish.t("指标")]: props.fish.t("投入最多科目"), [props.fish.t("值")]: props.fish.weekStats.value.topSubject },
  { [props.fish.t("指标")]: props.fish.t("最高频卡点"), [props.fish.t("值")]: props.fish.weekStats.value.topCause },
  { [props.fish.t("指标")]: props.fish.t("下周优先抓"), [props.fish.t("值")]: props.fish.weekStats.value.nextFocus },
]);

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => props.fish.importState(parseImportedState(String(reader.result || "{}")));
  reader.readAsText(file);
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Weekly</p><h2>{{ fish.t("周复盘") }}</h2></div><div class="topbar-actions"><label class="secondary-button">{{ fish.t("导入数据") }}<input hidden type="file" accept="application/json" @change="importData" /></label><ExportActions :title="fish.t('周复盘')" :payload="fish.state" :rows="exportRows" /><button class="danger-button" @click="fish.resetState">{{ fish.t("清空数据") }}</button></div></div>
    <div class="review-grid">
      <section class="panel stat-panel"><p class="panel-kicker">Time</p><strong>{{ fish.weekStats.value.minutes }}</strong><span>{{ fish.t("本周有效分钟") }}</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Subject</p><strong>{{ fish.weekStats.value.topSubject }}</strong><span>{{ fish.t("投入最多科目") }}</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Risk</p><strong>{{ fish.weekStats.value.topCause }}</strong><span>{{ fish.t("最高频卡点") }}</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Next</p><strong>{{ fish.weekStats.value.nextFocus }}</strong><span>{{ fish.t("下周优先抓") }}</span></section>
    </div>
    <section class="panel weekly-panel"><p>{{ fish.t("这周先把最高频错因收口，再给主科留出连续 90 分钟的完整块。") }}</p></section>
  </section>
</template>
