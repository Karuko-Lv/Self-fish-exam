<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });

const planDaysInput = ref(props.fish.state.pagedPlan?.days || 7);
const planPageIndex = ref(0);
const planCardRef = ref(null);
const newTodoText = ref("");

const planPages = computed(() => props.fish.state.pagedPlan?.pages || []);

const currentPlanPageIndex = computed(() => {
  if (!planPages.value.length) return 0;
  return Math.min(Math.max(planPageIndex.value, 0), planPages.value.length - 1);
});

const currentPlanPage = computed(() => planPages.value[currentPlanPageIndex.value] || null);

const currentTodoStats = computed(() => {
  const todos = currentPlanPage.value?.todos || [];
  const done = todos.filter((todo) => todo.done).length;
  return { done, total: todos.length };
});

const pagedPlanStats = computed(() => {
  const total = planPages.value.length;
  const done = planPages.value.filter((page) => page.done).length;
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
});

const visiblePlanPages = computed(() => {
  const total = planPages.value.length;
  if (total <= 9) return planPages.value.map((page, index) => ({ page, index }));
  const current = currentPlanPageIndex.value;
  const start = Math.min(Math.max(current - 4, 0), total - 9);
  return planPages.value.slice(start, start + 9).map((page, offset) => ({ page, index: start + offset }));
});

const exportRows = computed(() =>
  planPages.value.map((page) => ({
    天数: page.day,
    标题: props.fish.tx(page.title),
    今日目标: props.fish.tx(page.goal),
    步骤拆解: props.fish.tx(page.tasks),
    Todo: (page.todos || []).map((todo) => `${todo.done ? "[x]" : "[ ]"} ${props.fish.tx(todo.text)}`).join("\n"),
    输出记录: props.fish.tx(page.output),
    完成: page.done ? "是" : "否",
  })),
);

watch(
  () => props.fish.state.pagedPlan?.days,
  (days) => {
    if (days) planDaysInput.value = days;
  },
  { immediate: true },
);

function generatePlanPages() {
  props.fish.generatePagedPlan(planDaysInput.value);
  planPageIndex.value = 0;
  resizePlanTextareas();
}

function setPlanPage(index) {
  if (!planPages.value.length) return;
  planPageIndex.value = Math.min(Math.max(index, 0), planPages.value.length - 1);
  resizePlanTextareas();
}

function updatePlanPage(field, value) {
  if (!currentPlanPage.value) return;
  props.fish.updatePagedPlanPage(currentPlanPage.value.id, { [field]: value });
}

function resizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizePlanTextareas() {
  nextTick(() => {
    planCardRef.value?.querySelectorAll("textarea").forEach(resizeTextarea);
  });
}

function updatePlanTextarea(field, event) {
  updatePlanPage(field, event.target.value);
  resizeTextarea(event.target);
}

function addCurrentTodo() {
  if (!currentPlanPage.value) return;
  props.fish.addPagedPlanTodo(currentPlanPage.value.id, newTodoText.value);
  newTodoText.value = "";
}

watch(currentPlanPageIndex, resizePlanTextareas);
watch(() => planPages.value.length, resizePlanTextareas);
onMounted(resizePlanTextareas);
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Plan Book</p>
        <h2>{{ fish.t("计划栏") }}</h2>
      </div>
      <div class="topbar-actions">
        <span v-if="planPages.length" class="metric-pill">{{ pagedPlanStats.done }}/{{ pagedPlanStats.total }} · {{ pagedPlanStats.pct }}%</span>
        <ExportActions :title="fish.t('计划栏')" :payload="fish.state.pagedPlan" :rows="exportRows" />
      </div>
    </div>

    <section class="panel paged-plan-panel">
      <div class="panel-header paged-plan-header">
        <div>
          <p class="panel-kicker">Generator</p>
          <h3>{{ fish.t("按天生成翻页计划") }}</h3>
        </div>
        <form class="plan-generate-form" @submit.prevent="generatePlanPages">
          <label>
            {{ fish.t("计划天数") }}
            <input v-model.number="planDaysInput" type="number" inputmode="numeric" min="1" max="120" />
          </label>
          <button class="primary-button" type="submit">{{ fish.t(planPages.length ? "重新生成" : "生成计划") }}</button>
        </form>
      </div>

      <div v-if="planPages.length" class="plan-progress-row">
        <div>
          <strong>{{ fish.t("计划进度") }}</strong>
          <span>{{ pagedPlanStats.done }}/{{ pagedPlanStats.total }} · {{ pagedPlanStats.pct }}%</span>
        </div>
        <div class="plan-progress-track" aria-hidden="true">
          <span :style="{ width: pagedPlanStats.pct + '%' }"></span>
        </div>
      </div>

      <article v-if="currentPlanPage" ref="planCardRef" class="paged-plan-card" :class="{ 'is-done': currentPlanPage.done }">
        <div class="plan-page-top">
          <div>
            <p class="panel-kicker">{{ fish.t("第 {day} 天", { day: currentPlanPage.day }) }}</p>
            <strong>{{ fish.tx(currentPlanPage.title) || fish.t("未命名计划") }}</strong>
          </div>
          <button class="small-button" type="button" @click="fish.togglePagedPlanPage(currentPlanPage.id)">
            {{ currentPlanPage.done ? fish.t("取消完成") : fish.t("标记完成") }}
          </button>
        </div>

        <label class="plan-title-field">
          {{ fish.t("计划标题") }}
          <input
            :value="fish.textSource(currentPlanPage.title)"
            :placeholder="fish.t('例如：线性表专项 + 英语阅读')"
            @input="updatePlanPage('title', $event.target.value)"
          />
        </label>

        <div class="plan-todo-block">
          <div class="plan-todo-header">
            <div>
              <p class="panel-kicker">Todo</p>
              <h4>{{ fish.t("今日 Todo") }}</h4>
            </div>
            <span v-if="currentTodoStats.total" class="metric-pill">{{ currentTodoStats.done }}/{{ currentTodoStats.total }}</span>
          </div>

          <form class="plan-todo-form" @submit.prevent="addCurrentTodo">
            <input v-model="newTodoText" maxlength="80" :placeholder="fish.t('添加今天要完成的一件事')" />
            <button class="small-button" type="submit">{{ fish.t("添加") }}</button>
          </form>

          <div v-if="currentPlanPage.todos?.length" class="plan-todo-list">
            <div v-for="todo in currentPlanPage.todos" :key="todo.id" class="plan-todo-item" :class="{ 'is-done': todo.done }">
              <input type="checkbox" :checked="todo.done" :aria-label="fish.t('切换 Todo 状态')" @change="fish.togglePagedPlanTodo(currentPlanPage.id, todo.id)" />
              <input
                class="plan-todo-text"
                :value="fish.textSource(todo.text)"
                maxlength="80"
                @input="fish.updatePagedPlanTodo(currentPlanPage.id, todo.id, $event.target.value)"
              />
              <button class="icon-button" type="button" :aria-label="fish.t('删除 Todo')" @click="fish.deletePagedPlanTodo(currentPlanPage.id, todo.id)">×</button>
            </div>
          </div>
          <p v-else class="empty-note">{{ fish.t("今天还没有 Todo。") }}</p>
        </div>

        <div class="plan-textarea-grid">
          <label>
            {{ fish.t("今日目标") }}
            <textarea
              rows="4"
              :value="fish.textSource(currentPlanPage.goal)"
              :placeholder="fish.t('写清楚这一天最重要的推进目标。')"
              @input="updatePlanTextarea('goal', $event)"
            ></textarea>
          </label>
          <label>
            {{ fish.t("步骤拆解") }}
            <textarea
              rows="4"
              :value="fish.textSource(currentPlanPage.tasks)"
              :placeholder="fish.t('把目标拆成 2-5 个可执行动作。')"
              @input="updatePlanTextarea('tasks', $event)"
            ></textarea>
          </label>
          <label>
            {{ fish.t("输出记录") }}
            <textarea
              rows="4"
              :value="fish.textSource(currentPlanPage.output)"
              :placeholder="fish.t('写今天要产出的笔记、错题复盘、讲解稿或思维导图。')"
              @input="updatePlanTextarea('output', $event)"
            ></textarea>
          </label>
        </div>
      </article>

      <div v-else class="paged-plan-empty">
        <strong>{{ fish.t("还没有生成计划") }}</strong>
        <span>{{ fish.t("输入天数后点击生成，就会得到可以翻页填写的计划卡。") }}</span>
      </div>

      <div v-if="planPages.length" class="paginator plan-paginator">
        <button class="small-button" type="button" :disabled="currentPlanPageIndex <= 0" @click="setPlanPage(currentPlanPageIndex - 1)">
          {{ fish.t("上一页") }}
        </button>
        <div class="plan-page-dots" aria-label="Plan pages">
          <button
            v-for="item in visiblePlanPages"
            :key="item.page.id"
            class="plan-page-dot"
            :class="{ 'is-active': item.index === currentPlanPageIndex, 'is-done': item.page.done }"
            type="button"
            :aria-label="fish.t('第 {day} 天', { day: item.page.day })"
            @click="setPlanPage(item.index)"
          >
            {{ item.page.day }}
          </button>
        </div>
        <span class="paginator-info">{{ fish.t("第 {page} 张", { page: currentPlanPageIndex + 1 }) }} / {{ planPages.length }}</span>
        <button class="small-button" type="button" :disabled="currentPlanPageIndex >= planPages.length - 1" @click="setPlanPage(currentPlanPageIndex + 1)">
          {{ fish.t("下一页") }}
        </button>
      </div>
    </section>
  </section>
</template>
