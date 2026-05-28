<script setup>
import { ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { exportState, parseImportedState } from "../utils/state.js";

const props = defineProps({ fish: { type: Object, required: true } });
const fileInput = ref(null);
const importing = ref(false);

function handleExportFull() {
  const json = exportState(props.fish.state);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "self-fish-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  importing.value = true;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const nextState = parseImportedState(reader.result);
      props.fish.importState(nextState);
      props.fish.notify(props.fish.t("数据已导入并同步到云端。"));
    } catch {
      props.fish.notify(props.fish.t("导入失败，请检查文件格式。"));
    } finally {
      importing.value = false;
    }
  };
  reader.onerror = () => {
    props.fish.notify(props.fish.t("文件读取失败，请重试。"));
    importing.value = false;
  };
  reader.readAsText(file);
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Settings</p>
        <h2>{{ fish.t("设置") }}</h2>
      </div>
      <div class="topbar-actions">
        <span class="metric-pill">{{ fish.state.settings.adaptiveFit ? fish.t("自适应开启") : fish.t("自适应关闭") }}</span>
        <ExportActions
          :title="fish.t('设置')"
          :payload="fish.state.settings"
          :rows="[{ [fish.t('设置项')]: fish.t('自适应界面'), [fish.t('值')]: fish.state.settings.adaptiveFit ? fish.t('开启') : fish.t('关闭') }]"
        />
      </div>
    </div>
    <div class="settings-grid">
      <section class="panel settings-panel">
        <p class="panel-kicker">Language</p>
        <h3>{{ fish.t("语言") }}</h3>
        <div class="segmented-control" role="group" :aria-label="fish.t('语言')">
          <button type="button" :class="{ 'is-active': fish.language.value === 'zh' }" @click="fish.setLanguage('zh')">
            {{ fish.t("中文") }}
          </button>
          <button type="button" :class="{ 'is-active': fish.language.value === 'en' }" @click="fish.setLanguage('en')">
            English
          </button>
        </div>
      </section>
      <section class="panel settings-panel">
        <p class="panel-kicker">Cloud</p>
        <h3>{{ fish.t("云端同步") }}</h3>
        <p class="settings-copy">{{ fish.t("当前账号的数据会保存到服务器。多个设备打开同一个链接并登录同一账号后，会读取同一份云端数据。") }}</p>
        <button class="adaptive-toggle-button" @click="fish.state.settings.adaptiveFit = !fish.state.settings.adaptiveFit">
          {{ fish.state.settings.adaptiveFit ? fish.t("关闭自适应匹配") : fish.t("开启自适应匹配界面大小") }}
        </button>
      </section>
      <section class="panel settings-panel">
        <p class="panel-kicker">Data</p>
        <h3>{{ fish.t("数据管理") }}</h3>
        <p class="settings-copy">{{ fish.t("导出全部数据为 JSON 文件，可在其他设备或部署中导入。") }}</p>
        <div class="settings-actions">
          <button class="primary-button" @click="handleExportFull">{{ fish.t("导出全部数据") }}</button>
          <button class="secondary-button" :disabled="importing" @click="fileInput?.click()">
            {{ importing ? fish.t("导入中...") : fish.t("导入数据") }}
          </button>
          <input ref="fileInput" type="file" accept=".json" class="avatar-file-input" @change="handleImportFile" />
        </div>
      </section>
      <section class="panel settings-preview"><div class="preview-window"><span></span><span></span><span></span><div class="preview-sidebar"></div><div class="preview-main"><i></i><i></i><i></i></div></div></section>
    </div>
  </section>
</template>
