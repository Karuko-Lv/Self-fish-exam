<script setup>
import { statusList, subjects } from "../constants/defaults.js";

defineProps({ fish: { type: Object, required: true } });
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Map</p><h2>全科进度</h2></div><div class="status-legend"><span v-for="s in statusList" :key="s.id">{{ s.label }}</span></div></div>
    <div class="map-grid">
      <section v-for="subject in subjects" :key="subject.id" class="panel subject-panel">
        <h3>{{ subject.name }}</h3>
        <div class="topic-list">
          <article v-for="topic in fish.state.topicState[subject.id]" :key="topic.id" class="topic-row">
            <span>{{ topic.name }}</span>
            <select :value="topic.status" @change="fish.updateTopicStatus(subject.id, topic.id, $event.target.value)">
              <option v-for="status in statusList" :key="status.id" :value="status.id">{{ status.label }}</option>
            </select>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
