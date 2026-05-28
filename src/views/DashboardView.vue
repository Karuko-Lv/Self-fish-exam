<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { moods, shortPoolLines } from "../constants/defaults.js";
import { daysUntil } from "../utils/dates.js";

const props = defineProps({ fish: { type: Object, required: true } });
const now = ref(new Date());
const poolLine = ref(shortPoolLines[Math.floor(Math.random() * shortPoolLines.length)] || "稳住节奏");
let clockTimer = null;

const nextCountdown = computed(() =>
  [...props.fish.state.countdownEvents]
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0],
);

const nextCountdownDays = computed(() => (nextCountdown.value ? daysUntil(nextCountdown.value.date, now.value) : 0));

const todayLabel = computed(() =>
  now.value.toLocaleDateString(props.fish.language.value === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }),
);

const timeLabel = computed(() =>
  now.value.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
);

const until23Label = computed(() => {
  const target = new Date(now.value);
  target.setHours(23, 0, 0, 0);
  const diff = Math.max(0, target - now.value);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (props.fish.language.value === "en") return `${hours} hours ${minutes} minutes`;
  return `${hours} 小时 ${minutes} 分钟`;
});

const calendarYear = ref(new Date().getFullYear());
const calendarMonth = ref(new Date().getMonth());

const weekDays = computed(() =>
  props.fish.language.value === "en"
    ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    : ["日", "一", "二", "三", "四", "五", "六"],
);

const calendarMonthLabel = computed(() => {
  if (props.fish.language.value === "en") {
    return new Date(calendarYear.value, calendarMonth.value, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
  }
  return `${calendarYear.value}年${calendarMonth.value + 1}月`;
});

const countdownDateMap = computed(() => {
  const map = {};
  for (const ev of props.fish.state.countdownEvents) {
    const d = new Date(ev.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    (map[key] ||= []).push(ev.title);
  }
  return map;
});

const calendarDays = computed(() => {
  const year = calendarYear.value;
  const month = calendarMonth.value;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null, isToday: false, hasCountdown: false, countdownTitles: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const titles = countdownDateMap.value[key] || [];
    days.push({
      date: d,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
      hasCountdown: titles.length > 0,
      countdownTitles: titles,
    });
  }
  while (days.length % 7 !== 0) {
    days.push({ date: null, isToday: false, hasCountdown: false, countdownTitles: [] });
  }
  return days;
});

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11;
    calendarYear.value--;
  } else {
    calendarMonth.value--;
  }
}

function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0;
    calendarYear.value++;
  } else {
    calendarMonth.value++;
  }
}

function goToToday() {
  const today = new Date();
  calendarYear.value = today.getFullYear();
  calendarMonth.value = today.getMonth();
}

const taskLanes = computed(() => [
  { id: "base", title: props.fish.t("保底计划"), hint: props.fish.t("低门槛，先不断线"), tasks: props.fish.state.tasks.filter((task) => task.level === "base") },
  { id: "standard", title: props.fish.t("标准计划"), hint: props.fish.t("主线推进，今天的主体"), tasks: props.fish.state.tasks.filter((task) => task.level === "standard") },
  { id: "burst", title: props.fish.t("冲刺计划"), hint: props.fish.t("状态好时加码"), tasks: props.fish.state.tasks.filter((task) => task.level === "burst") },
]);

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => window.clearInterval(clockTimer));
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Today</p>
        <h2 class="pool-title">{{ fish.t(poolLine) }}</h2>
      </div>
      <div class="topbar-actions">
        <ExportActions :title="fish.t('今日泳池')" :payload="{ tasks: fish.state.tasks }" />
        <label class="date-box">
          {{ fish.t("目标日期") }}
          <input :value="fish.state.examDate" type="date" @input="fish.setExamDate($event.target.value)" />
        </label>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-col">
        <section class="panel hero-panel">
          <div class="pool-clock">
            <strong>{{ todayLabel }}</strong>
            <span>{{ timeLabel }}</span>
            <em>{{ fish.language.value === 'en' ? `Until 23:00: ${until23Label}` : `距离 23:00 还有 ${until23Label}` }}</em>
          </div>
          <p class="panel-kicker">{{ fish.t("距离目标") }}</p>
          <div class="countdown"><strong>{{ fish.daysLeft.value }}</strong><span>{{ fish.t("天") }}</span></div>
          <p class="daily-line">{{ fish.promptFor('dashboard') }}</p>
          <div class="hero-stats">
            <div><strong>{{ fish.todayPractice.value }}</strong><span>{{ fish.t("今日刷题") }}</span></div>
            <div><strong>{{ fish.todaySentences.value }}</strong><span>{{ fish.t("今日长难句") }}</span></div>
            <div><strong>{{ fish.todayPomodoros.value }}</strong><span>{{ fish.t("番茄钟") }}</span></div>
            <div><strong>{{ fish.todayDistractions.value }}</strong><span>{{ fish.t("今日分心") }}</span></div>
          </div>
          <div v-if="nextCountdown" class="next-card">
            <div class="next-card-main">
              <div class="next-card-heading">
                <strong class="next-card-title">
                  <BilingualTextEditor
                    :fish="fish"
                    :value="nextCountdown.title"
                    @save="(text) => fish.updateTranslation('countdownEvents', nextCountdown.id, 'title', text)"
                  />
                </strong>
                <span class="next-card-date">{{ nextCountdown.date }}</span>
              </div>
              <ul class="todo-preview-list" v-if="nextCountdown.todos?.length">
                <li v-for="todo in nextCountdown.todos.slice(0, 3)" :key="todo.id" :class="{ done: todo.done }">
                  {{ fish.tx(todo.text) }}
                </li>
              </ul>
            </div>
            <div class="next-card-days">
              <strong>{{ nextCountdownDays }}</strong>
              <span>{{ fish.t("天") }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="dashboard-col">
        <section class="panel mini-calendar-panel">
          <div class="mini-calendar-header">
            <button class="mini-calendar-nav" type="button" @click="prevMonth">‹</button>
            <span class="mini-calendar-month">{{ calendarMonthLabel }}</span>
            <button class="mini-calendar-nav" type="button" @click="nextMonth">›</button>
          </div>
          <div class="mini-calendar-weekdays">
            <span v-for="d in weekDays" :key="d">{{ d }}</span>
          </div>
          <div class="mini-calendar-grid">
            <div
              v-for="(day, i) in calendarDays"
              :key="i"
              class="mini-calendar-day"
              :class="{ 'is-today': day.isToday, 'is-other-month': !day.date, 'is-countdown': day.hasCountdown }"
              :title="day.hasCountdown ? day.countdownTitles.join(', ') : ''"
            >
              <span v-if="day.date">{{ day.date }}</span>
              <span v-if="day.isToday" class="mini-calendar-bow"></span>
              <span v-if="day.hasCountdown" class="mini-calendar-countdown-bow"></span>
            </div>
          </div>
          <button class="mini-calendar-today-btn" type="button" @click="goToToday">{{ fish.t("回到今天") }}</button>
        </section>
      </div>

      <div class="state-tasks-row">
        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">State</p>
              <h3>{{ fish.t("现在的你") }}</h3>
            </div>
            <button class="icon-button" type="button" @click="fish.resetDailyTasks">↻</button>
          </div>
          <div class="mood-grid">
            <button
              v-for="mood in moods"
              :key="mood.id"
              class="mood-card"
              :class="{ 'is-active': fish.state.selectedMood === mood.id }"
              type="button"
              @click="fish.selectMood(mood.id)"
            >
              <strong>{{ fish.t(mood.title) }}</strong>
              <span>{{ fish.t(mood.desc) }}</span>
            </button>
          </div>
          <p class="recommend-box">
            {{ fish.t(moods.find((mood) => mood.id === fish.state.selectedMood)?.advice || "先选一个状态，系统会把任务门槛调到合适的位置。") }}
          </p>
          <p class="prompt-chip">{{ fish.promptFor('practice') }}</p>
        </section>

        <section class="panel tasks-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Plan</p>
              <h3>{{ fish.t("三档任务") }}</h3>
            </div>
            <button class="primary-button" type="button" @click="fish.applyMoodTasks">{{ fish.t("状态匹配") }}</button>
          </div>
          <div class="task-lanes">
            <section v-for="lane in taskLanes" :key="lane.id" class="task-lane" :class="`is-${lane.id}`">
              <div class="task-lane-title"><strong>{{ lane.title }}</strong><span>{{ lane.hint }}</span></div>
              <label v-for="task in lane.tasks" :key="task.id" class="task-row">
                <input type="checkbox" :checked="task.done" @change="fish.toggleTask(task.id)" />
                <span>
                  <strong>{{ fish.tx(task.title) }}</strong>
                  <small>{{ fish.subjectName(task.subject) }} · {{ task.minutes }} {{ fish.t("分钟") }} · {{ fish.tx(task.detail) }}</small>
                </span>
              </label>
              <p v-if="!lane.tasks.length" class="empty-note">{{ fish.t('选择状态后点击"状态匹配"，这里会生成对应规格的任务。') }}</p>
            </section>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
