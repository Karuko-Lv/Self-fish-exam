<script setup>
defineProps({ fish: { type: Object, required: true } });
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Settings</p><h2>设置</h2></div><span class="metric-pill">{{ fish.state.settings.adaptiveFit ? '自适应开启' : '自适应关闭' }}</span></div>
    <div class="settings-grid">
      <section class="panel settings-panel"><p class="panel-kicker">Cloud</p><h3>云端同步</h3><p class="settings-copy">当前账号的数据会保存到服务器。多个设备打开同一个链接并登录同一账号后，会读取同一份云端数据。</p><button class="adaptive-toggle-button" @click="fish.state.settings.adaptiveFit = !fish.state.settings.adaptiveFit">{{ fish.state.settings.adaptiveFit ? '关闭自适应匹配' : '开启自适应匹配界面大小' }}</button></section>
      <section class="panel settings-preview"><div class="preview-window"><span></span><span></span><span></span><div class="preview-sidebar"></div><div class="preview-main"><i></i><i></i><i></i></div></div></section>
    </div>
  </section>
</template>
