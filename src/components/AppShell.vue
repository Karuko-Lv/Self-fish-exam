<script setup>
import { computed, ref } from "vue";
import CountdownsView from "../views/CountdownsView.vue";
import DashboardView from "../views/DashboardView.vue";
import DistractionsView from "../views/DistractionsView.vue";
import IdeasView from "../views/IdeasView.vue";
import KnowledgeReviewView from "../views/KnowledgeReviewView.vue";
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
const avatarInput = ref(null);
const avatarSrc = computed(() => props.fish.state.settings.avatarImage || "");
const maxAvatarBytes = 2 * 1024 * 1024;

const navItems = [
  ["dashboard", "今日泳池", "▣"],
  ["countdowns", "倒数日", "D"],
  ["map", "全科进度", "⌁"],
  ["practice", "刷题记录", "#"],
  ["sentences", "长难句", "句"],
  ["timer", "番茄钟", "◷"],
  ["distractions", "分心记录", "☆"],
  ["knowledgeReviews", "知识点复盘", "!"],
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
      knowledgeReviews: KnowledgeReviewView,
      ideas: IdeasView,
      review: WeeklyReviewView,
      settings: SettingsView,
    })[activeView.value],
);

function openAvatarPicker() {
  avatarInput.value?.click();
}

function handleAvatarUpload(event) {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    props.fish.notify(props.fish.t("请选择图片文件。"));
    return;
  }

  if (file.size > maxAvatarBytes) {
    props.fish.notify(props.fish.t("图片不要超过 2MB。"));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    if (!result.startsWith("data:image/")) {
      props.fish.notify(props.fish.t("头像读取失败，请换一张图片。"));
      return;
    }
    props.fish.setAvatarImage(result);
  };
  reader.onerror = () => props.fish.notify(props.fish.t("头像读取失败，请换一张图片。"));
  reader.readAsDataURL(file);
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :aria-label="fish.t('主导航')">
      <div class="sidebar-inner">
        <div class="brand-block">
          <div class="avatar-upload">
            <button
              class="avatar-upload-button"
              type="button"
              :aria-label="fish.t('上传头像')"
              :title="fish.t('上传头像')"
              @click="openAvatarPicker"
            >
              <img v-if="avatarSrc" class="avatar-photo" :src="avatarSrc" :alt="fish.t('当前头像')" />
              <span v-else class="kitty-face small" aria-hidden="true"><span></span></span>
              <span class="avatar-upload-badge" aria-hidden="true">+</span>
            </button>
            <input
              ref="avatarInput"
              class="avatar-file-input"
              type="file"
              accept="image/*"
              @change="handleAvatarUpload"
            />
          </div>
          <div>
            <p class="eyebrow">Kitty Focus</p>
            <h1>{{ fish.t("加油小小鱼") }}</h1>
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
            {{ fish.t(label) }}
          </button>
        </nav>
        <div class="sidebar-note">
          <strong>{{ user.name }}</strong>
          <span>{{ fish.t(fish.syncStatus.value) }}</span>
          <button class="ghost-button" type="button" @click="emit('logout')">{{ fish.t("退出") }}</button>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <component :is="currentComponent" :fish="props.fish" />
    </main>
  </div>
</template>
