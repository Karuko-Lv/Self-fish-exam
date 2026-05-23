<script setup>
import { computed, ref } from "vue";
import CountdownsView from "../views/CountdownsView.vue";
import DashboardView from "../views/DashboardView.vue";
import DistractionsView from "../views/DistractionsView.vue";
import IdeasView from "../views/IdeasView.vue";
import MistakesView from "../views/MistakesView.vue";
import PracticeView from "../views/PracticeView.vue";
import SentencesView from "../views/SentencesView.vue";
import SettingsView from "../views/SettingsView.vue";
import SubjectMapView from "../views/SubjectMapView.vue";
import TimerView from "../views/TimerView.vue";
import WeeklyReviewView from "../views/WeeklyReviewView.vue";

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  fish: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["logout"]);
const activeView = ref("dashboard");

const navItems = [
  ["dashboard", "今日泳池", "▣"],
  ["countdowns", "倒数日", "D"],
  ["map", "全科进度", "⌁"],
  ["practice", "刷题记录", "#"],
  ["sentences", "长难句", "句"],
  ["timer", "番茄钟", "◷"],
  ["distractions", "分心记录", "☆"],
  ["mistakes", "错题复盘", "!"],
  ["ideas", "灵感停车场", "+"],
  ["review", "周复盘", "∑"],
  ["settings", "设置", "⚙"],
];

const currentComponent = computed(
  () =>
    ({
      dashboard: DashboardView,
      countdowns: CountdownsView,
      map: SubjectMapView,
      practice: PracticeView,
      sentences: SentencesView,
      timer: TimerView,
      distractions: DistractionsView,
      mistakes: MistakesView,
      ideas: IdeasView,
      review: WeeklyReviewView,
      settings: SettingsView,
    })[activeView.value],
);
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="主导航">
      <div class="brand-block">
        <div class="kitty-face small" aria-hidden="true"><span></span></div>
        <div>
          <p class="eyebrow">Kitty Focus</p>
          <h1>加油小小鱼</h1>
        </div>
      </div>
      <nav class="nav-list">
        <button
          v-for="[id, label, icon] in navItems"
          :key="id"
          class="nav-item"
          :class="{ 'is-active': activeView === id }"
          type="button"
          @click="activeView = id"
        >
          <span class="nav-icon" aria-hidden="true">{{ icon }}</span>
          {{ label }}
        </button>
      </nav>
      <div class="sidebar-note">
        <strong>{{ user.name }}</strong>
        <span>{{ fish.syncStatus.value }}</span>
        <button class="ghost-button" type="button" @click="emit('logout')">退出</button>
      </div>
    </aside>
    <main class="main-content">
      <component :is="currentComponent" :fish="props.fish" />
    </main>
  </div>
</template>
