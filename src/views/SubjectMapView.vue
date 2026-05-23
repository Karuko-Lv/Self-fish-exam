<script setup>
import { statusList, subjects } from "../constants/defaults.js";

defineProps({ fish: { type: Object, required: true } });

const statusById = Object.fromEntries(statusList.map((status) => [status.id, status]));

function nextStatusId(currentStatus) {
  const index = statusList.findIndex((status) => status.id === currentStatus);
  return statusList[(index + 1) % statusList.length].id;
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div><p class="eyebrow">Map</p><h2>全科进度</h2></div>
      <div class="status-legend">
        <span v-for="s in statusList" :key="s.id" :class="`status-dot is-${s.id}`">{{ s.label }}</span>
      </div>
    </div>
    <section class="panel progress-board">
      <div class="panel-header">
        <div>
          <p class="panel-kicker">Overview</p>
          <h3>知识点状态总览</h3>
        </div>
        <span class="metric-pill">{{ fish.promptFor('map') }}</span>
      </div>
      <div class="progress-matrix">
        <section v-for="subject in subjects" :key="subject.id" class="subject-lane">
          <div class="subject-lane-header" :style="{ '--subject-accent': subject.accent }">
            <strong>{{ subject.name }}</strong>
            <span>{{ fish.state.topicState[subject.id].filter((topic) => topic.status === 'mastered' || topic.status === 'review').length }}/{{ fish.state.topicState[subject.id].length }}</span>
          </div>
          <div class="topic-chip-grid">
            <button
              v-for="topic in fish.state.topicState[subject.id]"
              :key="topic.id"
              class="topic-chip"
              :class="`is-${topic.status}`"
              type="button"
              :title="`点击切换状态：${topic.name}`"
              @click="fish.updateTopicStatus(subject.id, topic.id, nextStatusId(topic.status))"
            >
              <span>{{ topic.name }}</span>
              <em>{{ statusById[topic.status]?.label }}</em>
            </button>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>
