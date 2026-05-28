<script setup>
import { computed, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });

const categories = [
  { id: "food", label: "餐饮" },
  { id: "transport", label: "交通" },
  { id: "shopping", label: "购物" },
  { id: "study", label: "学习" },
  { id: "housing", label: "居住" },
  { id: "entertainment", label: "娱乐" },
  { id: "other", label: "其他" },
];

const form = reactive({ amount: null, category: "food", type: "expense", note: "" });
const editingId = ref("");
const editForm = reactive({ amount: null, category: "food", type: "expense", note: "" });
const filter = ref("all");

const filtered = computed(() => {
  if (filter.value === "income") return props.fish.state.expenses.filter((e) => e.type === "income");
  if (filter.value === "expense") return props.fish.state.expenses.filter((e) => e.type === "expense");
  return props.fish.state.expenses;
});

const todayExpense = computed(() =>
  filtered.value.reduce((sum, e) => e.type === "expense" ? sum + Number(e.amount || 0) : sum, 0),
);
const todayIncome = computed(() =>
  filtered.value.reduce((sum, e) => e.type === "income" ? sum + Number(e.amount || 0) : sum, 0),
);
const balance = computed(() => todayIncome.value - todayExpense.value);

const exportRows = computed(() =>
  filtered.value.map((e) => ({
    类型: e.type === "income" ? props.fish.t("收入") : props.fish.t("支出"),
    金额: e.amount,
    分类: props.fish.t(categories.find((c) => c.id === e.category)?.label || e.category),
    备注: props.fish.tx(e.note),
    日期: e.date,
  })),
);

function submit() {
  props.fish.addExpense({ amount: form.amount, category: form.category, type: form.type, note: form.note });
  form.amount = null;
  form.note = "";
}

function startEdit(item) {
  editingId.value = item.id;
  editForm.amount = item.amount;
  editForm.category = item.category;
  editForm.type = item.type;
  editForm.note = props.fish.textSource(item.note);
}

function saveEdit(id) {
  props.fish.updateById("expenses", id, {
    amount: editForm.amount,
    category: editForm.category,
    type: editForm.type,
    note: editForm.note,
  });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Expense</p>
        <h2>{{ fish.t("记账") }}</h2>
      </div>
      <div class="practice-metrics">
        <span class="metric-pill">{{ fish.t("支出") }} ¥{{ todayExpense }}</span>
        <span class="metric-pill">{{ fish.t("收入") }} ¥{{ todayIncome }}</span>
        <span class="metric-pill" :style="{ color: balance >= 0 ? 'var(--green)' : 'var(--coral)' }">{{ fish.t("结余") }} ¥{{ balance }}</span>
        <ExportActions :title="fish.t('记账')" :payload="filtered" :rows="exportRows" />
      </div>
    </div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Log</p>
        <h3>{{ fish.t("记一笔") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <div class="segmented-control">
            <button type="button" :class="{ 'is-active': form.type === 'expense' }" @click="form.type = 'expense'">{{ fish.t("支出") }}</button>
            <button type="button" :class="{ 'is-active': form.type === 'income' }" @click="form.type = 'income'">{{ fish.t("收入") }}</button>
          </div>
          <label>{{ fish.t("金额") }}<input v-model.number="form.amount" type="number" min="0.01" step="0.01" required /></label>
          <label>{{ fish.t("分类") }}<select v-model="form.category"><option v-for="c in categories" :key="c.id" :value="c.id">{{ fish.t(c.label) }}</option></select></label>
          <label>{{ fish.t("备注") }}<input v-model="form.note" maxlength="60" /></label>
          <button class="primary-button" type="submit">{{ fish.t("记录") }}</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">History</p>
        <div class="panel-header">
          <h3>{{ fish.t("最近记录") }}</h3>
          <div class="filter-group">
            <button class="filter-chip" :class="{ 'is-active': filter === 'all' }" @click="filter = 'all'">{{ fish.t("全部") }}</button>
            <button class="filter-chip" :class="{ 'is-active': filter === 'expense' }" @click="filter = 'expense'">{{ fish.t("支出") }}</button>
            <button class="filter-chip" :class="{ 'is-active': filter === 'income' }" @click="filter = 'income'">{{ fish.t("收入") }}</button>
          </div>
        </div>
        <div class="item-list">
          <p v-if="!filtered.length" class="empty-note">{{ fish.t("暂无记录") }}</p>
          <article v-for="item in filtered" :key="item.id" class="list-item">
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <div class="segmented-control">
                <button type="button" :class="{ 'is-active': editForm.type === 'expense' }" @click="editForm.type = 'expense'">{{ fish.t("支出") }}</button>
                <button type="button" :class="{ 'is-active': editForm.type === 'income' }" @click="editForm.type = 'income'">{{ fish.t("收入") }}</button>
              </div>
              <label>{{ fish.t("金额") }}<input v-model.number="editForm.amount" type="number" min="0.01" step="0.01" required /></label>
              <label>{{ fish.t("分类") }}<select v-model="editForm.category"><option v-for="c in categories" :key="c.id" :value="c.id">{{ fish.t(c.label) }}</option></select></label>
              <label class="wide-field">{{ fish.t("备注") }}<input v-model="editForm.note" maxlength="60" /></label>
              <div class="row-actions wide-field">
                <button class="primary-button">{{ fish.t("保存") }}</button>
                <button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button>
              </div>
            </form>
            <template v-else>
              <div>
                <strong>
                  <span :style="{ color: item.type === 'income' ? 'var(--green)' : 'var(--coral)' }">{{ item.type === 'income' ? '+' : '-' }}¥{{ item.amount }}</span>
                </strong>
                <small>{{ fish.t(categories.find((c) => c.id === item.category)?.label || item.category) }} · {{ item.date }}</small>
                <p v-if="props.fish.tx(item.note)"><BilingualTextEditor :fish="fish" :value="item.note" textarea @save="(text) => fish.updateTranslation('expenses', item.id, 'note', text)" /></p>
              </div>
              <div class="row-actions">
                <button type="button" @click="startEdit(item)">{{ fish.t("编辑") }}</button>
                <button type="button" @click="fish.deleteById('expenses', item.id)">{{ fish.t("删除") }}</button>
              </div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
