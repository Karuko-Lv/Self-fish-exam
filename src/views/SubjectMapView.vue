<script setup>
import { computed, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { statusList, subjects } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const activeSubject = ref(subjects[0].id);

const statusById = Object.fromEntries(statusList.map((status) => [status.id, status]));
const subjectById = Object.fromEntries(subjects.map((s) => [s.id, s]));

const currentTopics = computed(() => props.fish.state.topicState[activeSubject.value] || []);
const currentSubject = computed(() => subjectById[activeSubject.value]);

const progress = computed(() => {
  const topics = currentTopics.value;
  if (!topics.length) return 0;
  const done = topics.filter((t) => t.status === "mastered" || t.status === "review").length;
  return Math.round((done / topics.length) * 100);
});

const allSubjectStats = computed(() =>
  subjects.map((s) => {
    const topics = props.fish.state.topicState[s.id] || [];
    const done = topics.filter((t) => t.status === "mastered" || t.status === "review").length;
    return { id: s.id, name: s.name, accent: s.accent, done, total: topics.length, pct: topics.length ? Math.round((done / topics.length) * 100) : 0 };
  }),
);

const exportRows = computed(() =>
  subjects.flatMap((subject) =>
    props.fish.state.topicState[subject.id].map((topic) => ({
      科目: props.fish.t(subject.name),
      知识点: props.fish.t(topic.name),
      状态: props.fish.t(statusById[topic.status]?.label || topic.status),
    })),
  ),
);

function nextStatusId(currentStatus) {
  const index = statusList.findIndex((status) => status.id === currentStatus);
  return statusList[(index + 1) % statusList.length].id;
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div><p class="eyebrow">Map</p><h2>{{ fish.t("全科进度") }}</h2></div>
      <div class="topbar-actions">
        <div class="status-legend">
          <span v-for="s in statusList" :key="s.id" :class="`status-dot is-${s.id}`">{{ fish.t(s.label) }}</span>
        </div>
        <ExportActions :title="fish.t('全科进度')" :payload="fish.state.topicState" :rows="exportRows" />
      </div>
    </div>

    <nav class="subject-tabs">
      <button
        v-for="stat in allSubjectStats"
        :key="stat.id"
        class="subject-tab"
        :class="{ 'is-active': activeSubject === stat.id }"
        :style="activeSubject === stat.id ? { '--subject-accent': stat.accent, borderColor: stat.accent, background: stat.accent + '14' } : {}"
        @click="activeSubject = stat.id"
      >
        <span class="subject-tab-name">{{ fish.t(stat.name) }}</span>
        <span class="subject-tab-stat">{{ stat.done }}/{{ stat.total }}</span>
      </button>
    </nav>

    <section class="panel progress-board">
      <div class="panel-header">
        <div>
          <p class="panel-kicker">{{ fish.t(currentSubject.name) }}</p>
          <h3>{{ fish.t("知识点状态总览") }}</h3>
        </div>
        <span class="metric-pill">{{ fish.promptFor('map') }}</span>
      </div>

      <div class="subject-progress-bar">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progress + '%', background: currentSubject.accent }"></div>
        </div>
        <span class="progress-label">{{ progress }}%</span>
      </div>

      <div class="topic-chip-grid subject-detail-grid">
        <button
          v-for="topic in currentTopics"
          :key="topic.id"
          class="topic-chip"
          :class="`is-${topic.status}`"
          type="button"
          @click="fish.updateTopicStatus(activeSubject, topic.id, nextStatusId(topic.status))"
        >
          <span>{{ fish.t(topic.name) }}</span>
          <em>{{ fish.t(statusById[topic.status]?.label) }}</em>
        </button>
      </div>
    </section>
  </section>
</template>
