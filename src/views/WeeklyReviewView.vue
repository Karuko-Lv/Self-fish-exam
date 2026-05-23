<script setup>
import { parseImportedState } from "../utils/state.js";

const props = defineProps({ fish: { type: Object, required: true } });

function exportData() {
  const blob = new Blob([JSON.stringify(props.fish.state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `self-fish-${props.fish.today.value}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

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
    <div class="topbar"><div><p class="eyebrow">Weekly</p><h2>周复盘</h2></div><div class="topbar-actions"><label class="secondary-button">导入数据<input hidden type="file" accept="application/json" @change="importData" /></label><button class="secondary-button" @click="exportData">导出数据</button><button class="danger-button" @click="fish.resetState">清空数据</button></div></div>
    <div class="review-grid">
      <section class="panel stat-panel"><p class="panel-kicker">Time</p><strong>{{ fish.weekStats.value.minutes }}</strong><span>本周有效分钟</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Subject</p><strong>{{ fish.weekStats.value.topSubject }}</strong><span>投入最多科目</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Risk</p><strong>{{ fish.weekStats.value.topCause }}</strong><span>最高频错因</span></section>
      <section class="panel stat-panel"><p class="panel-kicker">Next</p><strong>{{ fish.weekStats.value.nextFocus }}</strong><span>下周优先抓</span></section>
    </div>
    <section class="panel weekly-panel"><p>这周先把最高频错因收口，再给主科留出连续 90 分钟的完整块。</p></section>
  </section>
</template>
