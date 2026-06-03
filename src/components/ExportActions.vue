<script setup>
import { computed } from "vue";
import { exportCsv, exportPdf } from "../utils/exporters.js";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  payload: {
    type: [Array, Object],
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  pdfExporter: {
    type: Function,
    default: null,
  },
});

const exportRows = computed(() => props.rows.length ? props.rows : (Array.isArray(props.payload) ? props.payload : [props.payload]));

async function handlePdfExport() {
  if (props.pdfExporter) {
    await props.pdfExporter();
    return;
  }
  await exportPdf(props.title, exportRows.value);
}
</script>

<template>
  <div class="export-actions" aria-label="导出">
    <button class="small-button" type="button" @click="exportCsv(title, exportRows)">CSV</button>
    <button class="small-button" type="button" @click="handlePdfExport">PDF</button>
  </div>
</template>
