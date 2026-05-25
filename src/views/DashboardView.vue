<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { moods, shortPoolLines, subjects } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });
const focusForm = reactive({ subject: "ds", startTime: "08:00", endTime: "08:25", note: "" });
const editingFocusId = ref("");
const focusEditForm = reactive({ subject: "ds", startTime: "08:00", endTime: "08:25", note: "" });
const now = ref(new Date());
const poolLine = ref(shortPoolLines[Math.floor(Math.random() * shortPoolLines.length)] || "稳住节奏");
let clockTimer = null;

const nextCountdown = computed(() =>
  [...props.fish.state.countdownEvents]
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0],
);

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

const taskLanes = computed(() => [
  { id: "base", title: props.fish.t("保底计划"), hint: props.fish.t("低门槛，先不断线"), tasks: props.fish.state.tasks.filter((task) => task.level === "base") },
  { id: "standard", title: props.fish.t("标准计划"), hint: props.fish.t("主线推进，今天的主体"), tasks: props.fish.state.tasks.filter((task) => task.level === "standard") },
  { id: "burst", title: props.fish.t("冲刺计划"), hint: props.fish.t("状态好时加码"), tasks: props.fish.state.tasks.filter((task) => task.level === "burst") },
]);

const focusExportRows = computed(() =>
  props.fish.state.focusLogs.map((log) => ({
    日期: log.date,
    科目: props.fish.subjectName(log.subject),
    起始时间: log.startTime || "",
    终止时间: log.endTime || "",
    分钟: log.minutes,
    [props.fish.t("内容")]: props.fish.tx(log.note),
  })),
);

function submitFocus() {
  props.fish.addFocusLog({
    subject: focusForm.subject,
    startTime: focusForm.startTime,
    endTime: focusForm.endTime,
    note: focusForm.note,
  });
  focusForm.note = "";
}

function startEditFocus(log) {
  editingFocusId.value = log.id;
  Object.assign(focusEditForm, {
    subject: log.subject,
    startTime: log.startTime || "08:00",
    endTime: log.endTime || "08:25",
    note: props.fish.textSource(log.note),
  });
}

function saveFocusEdit(id) {
  props.fish.updateById("focusLogs", id, {
    ...focusEditForm,
    minutes: props.fish.minutesBetween(focusEditForm.startTime, focusEditForm.endTime),
  });
  editingFocusId.value = "";
}

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
        <ExportActions :title="fish.t('今日泳池')" :payload="{ focusLogs: fish.state.focusLogs, tasks: fish.state.tasks }" :rows="focusExportRows" />
        <label class="date-box">
          {{ fish.t("目标日期") }}
          <input :value="fish.state.examDate" type="date" @input="fish.setExamDate($event.target.value)" />
        </label>
      </div>
    </div>

    <div class="dashboard-grid">
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
          <strong>
            <BilingualTextEditor
              :fish="fish"
              :value="nextCountdown.title"
              @save="(text) => fish.updateTranslation('countdownEvents', nextCountdown.id, 'title', text)"
            />
          </strong>
          <span>{{ nextCountdown.date }}</span>
          <ul class="todo-preview-list" v-if="nextCountdown.todos?.length">
            <li v-for="todo in nextCountdown.todos.slice(0, 3)" :key="todo.id" :class="{ done: todo.done }">
              {{ fish.tx(todo.text) }}
            </li>
          </ul>
        </div>
      </section>

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
            <p v-if="!lane.tasks.length" class="empty-note">{{ fish.t("选择状态后点击“状态匹配”，这里会生成对应规格的任务。") }}</p>
          </section>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Focus</p>
            <h3>{{ fish.t("记一组学习") }}</h3>
          </div>
          <span class="metric-pill">{{ fish.todayMinutes.value }} {{ fish.t("分钟") }}</span>
        </div>
        <form class="compact-form" @submit.prevent="submitFocus">
          <label>{{ fish.t("科目") }}<select v-model="focusForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
          <label>{{ fish.t("起始时间") }}<input v-model="focusForm.startTime" type="time" /></label>
          <label>{{ fish.t("终止时间") }}<input v-model="focusForm.endTime" type="time" /></label>
          <label class="wide-field">{{ fish.t("做了什么") }}<input v-model="focusForm.note" maxlength="60" :placeholder="fish.t('例：数据结构树的遍历错题')" /></label>
          <button class="primary-button wide-button" type="submit">{{ fish.t("记录") }}</button>
        </form>
        <div class="mini-list">
          <article v-for="log in fish.state.focusLogs" :key="log.id">
            <form v-if="editingFocusId === log.id" class="inline-edit-form" @submit.prevent="saveFocusEdit(log.id)">
              <label>{{ fish.t("科目") }}<select v-model="focusEditForm.subject"><option v-for="s in subjects" :key="s.id" :value="s.id">{{ fish.t(s.name) }}</option></select></label>
              <label>{{ fish.t("起始") }}<input v-model="focusEditForm.startTime" type="time" /></label>
              <label>{{ fish.t("终止") }}<input v-model="focusEditForm.endTime" type="time" /></label>
              <label class="wide-field">{{ fish.t("内容") }}<input v-model="focusEditForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field"><button class="primary-button">{{ fish.t("保存") }}</button><button class="secondary-button" type="button" @click="editingFocusId = ''">{{ fish.t("取消") }}</button></div>
            </form>
            <template v-else>
              <span>
                {{ fish.subjectName(log.subject) }} · {{ log.startTime || '--:--' }}-{{ log.endTime || '--:--' }} · {{ log.minutes }} {{ fish.t("分钟") }}
                <BilingualTextEditor
                  v-if="fish.tx(log.note)"
                  :fish="fish"
                  :value="log.note"
                  @save="(text) => fish.updateTranslation('focusLogs', log.id, 'note', text)"
                />
              </span>
              <div class="row-actions"><button type="button" @click="startEditFocus(log)">{{ fish.t("编辑") }}</button><button type="button" @click="fish.deleteById('focusLogs', log.id)">{{ fish.t("删除") }}</button></div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
