<script setup>
import { computed, reactive, ref } from "vue";
import ExportActions from "../components/ExportActions.vue";
import { checkinKinds } from "../constants/defaults.js";

const props = defineProps({ fish: { type: Object, required: true } });

const selectedDate = ref(props.fish.today.value);
const form = reactive({ title: "", kind: "number", target: 50, unit: "个" });
const editingId = ref("");
const editForm = reactive({ title: "", kind: "number", target: 0, unit: "" });

const activeItems = computed(() => props.fish.state.dailyCheckins.filter((item) => item.active !== false));

const completion = computed(() => {
  const total = activeItems.value.length;
  const done = activeItems.value.filter((item) => isDone(item)).length;
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
});

const exportRows = computed(() => {
  const itemById = new Map(props.fish.state.dailyCheckins.map((item) => [item.id, item]));
  return Object.entries(props.fish.state.dailyCheckinLogs)
    .flatMap(([date, records]) =>
      Object.entries(records || {}).map(([itemId, record]) => {
        const item = itemById.get(itemId);
        return {
          日期: date,
          打卡项: item ? props.fish.tx(item.title) : itemId,
          目标: item ? targetText(item) : "",
          记录值: record.value || "",
          是否完成: record.done ? props.fish.t("是") : props.fish.t("否"),
          备注: props.fish.tx(record.note),
        };
      }),
    )
    .sort((a, b) => b.日期.localeCompare(a.日期));
});

const recentDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = offsetDate(props.fish.today.value, -index);
    const records = props.fish.state.dailyCheckinLogs[date] || {};
    const done = activeItems.value.filter((item) => records[item.id]?.done).length;
    const total = activeItems.value.length;
    return {
      date,
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }),
);

function offsetDate(isoDate, offset) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function recordFor(itemId, date = selectedDate.value) {
  return props.fish.state.dailyCheckinLogs[date]?.[itemId] || null;
}

function isDone(item, date = selectedDate.value) {
  return Boolean(recordFor(item.id, date)?.done);
}

function valueFor(itemId) {
  return recordFor(itemId)?.value || "";
}

function noteFor(itemId) {
  return props.fish.textSource(recordFor(itemId)?.note || "");
}

function targetText(item) {
  const unit = props.fish.tx(item.unit);
  if (item.kind === "check") return props.fish.t("完成一次");
  if (Number(item.target || 0) > 0) return `${props.fish.t("至少")} ${item.target}${unit}`;
  return unit ? `${props.fish.t("记录")} ${unit}` : props.fish.t("记录数值");
}

function submitItem() {
  if (!form.title.trim()) return;
  props.fish.addDailyCheckin({ ...form });
  form.title = "";
  form.kind = "number";
  form.target = 50;
  form.unit = "个";
}

function startEdit(item) {
  editingId.value = item.id;
  Object.assign(editForm, {
    title: props.fish.textSource(item.title),
    kind: item.kind,
    target: item.target,
    unit: props.fish.textSource(item.unit),
  });
}

function saveEdit(id) {
  if (!editForm.title.trim()) return;
  props.fish.updateDailyCheckin(id, { ...editForm });
  editingId.value = "";
}

function updateValue(item, value) {
  props.fish.updateDailyCheckinRecord(selectedDate.value, item.id, { value });
}

function updateNote(item, note) {
  props.fish.updateDailyCheckinRecord(selectedDate.value, item.id, { note });
}

function toggleItem(item) {
  props.fish.toggleDailyCheckinRecord(selectedDate.value, item.id);
}

function clearItem(item) {
  props.fish.clearDailyCheckinRecord(selectedDate.value, item.id);
}

function deleteItem(item) {
  props.fish.deleteDailyCheckin(item.id);
  if (editingId.value === item.id) editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Daily Check-in</p>
        <h2>{{ fish.t("每日打卡") }}</h2>
      </div>
      <ExportActions :title="fish.t('每日打卡')" :payload="{ items: fish.state.dailyCheckins, logs: fish.state.dailyCheckinLogs }" :rows="exportRows" />
    </div>

    <section class="panel checkin-overview">
      <div>
        <p class="panel-kicker">{{ fish.t("今天的完成度") }}</p>
        <h3>{{ completion.done }}/{{ completion.total }} · {{ completion.pct }}%</h3>
      </div>
      <label class="checkin-date-picker">
        {{ fish.t("打卡日期") }}
        <input v-model="selectedDate" type="date" />
      </label>
      <div class="checkin-progress-track" aria-hidden="true">
        <span :style="{ width: completion.pct + '%' }"></span>
      </div>
    </section>

    <div class="split-layout checkin-layout">
      <section class="panel">
        <div class="section-heading-row">
          <div>
            <p class="panel-kicker">{{ fish.t("今日清单") }}</p>
            <h3>{{ fish.t("把重复动作勾住") }}</h3>
          </div>
          <button class="secondary-button" type="button" @click="selectedDate = fish.today.value">{{ fish.t("回到今天") }}</button>
        </div>

        <div class="checkin-list">
          <article
            v-for="item in activeItems"
            :key="item.id"
            class="checkin-item"
            :class="{ 'is-done': isDone(item) }"
          >
            <button class="checkin-toggle" type="button" @click="toggleItem(item)" :aria-label="fish.t('切换打卡状态')">
              <span v-if="isDone(item)">✓</span>
            </button>
            <div class="checkin-main">
              <div class="checkin-title-row">
                <div>
                  <strong>{{ fish.tx(item.title) }}</strong>
                  <small>{{ targetText(item) }}</small>
                </div>
                <button class="small-button" type="button" @click="clearItem(item)">{{ fish.t("清除") }}</button>
              </div>
              <div class="checkin-input-row">
                <label v-if="item.kind === 'number'">
                  {{ fish.t("今日记录") }}
                  <div class="with-unit-input">
                    <input
                      :value="valueFor(item.id)"
                      type="number"
                      inputmode="decimal"
                      step="any"
                      :placeholder="Number(item.target || 0) > 0 ? String(item.target) : fish.t('记录数值')"
                      @change="updateValue(item, $event.target.value)"
                    />
                    <span v-if="fish.tx(item.unit)">{{ fish.tx(item.unit) }}</span>
                  </div>
                </label>
                <label class="checkin-note-field">
                  {{ fish.t("备注") }}
                  <input
                    :value="noteFor(item.id)"
                    maxlength="80"
                    :placeholder="fish.t('一句话记录今天的情况')"
                    @change="updateNote(item, $event.target.value)"
                  />
                </label>
              </div>
            </div>
          </article>
          <p v-if="!activeItems.length" class="empty-hint">{{ fish.t("还没有打卡项，先在右侧添加一个。") }}</p>
        </div>
      </section>

      <section class="panel">
        <p class="panel-kicker">{{ fish.t("自定义打卡") }}</p>
        <h3>{{ fish.t("指定每日要做的事") }}</h3>
        <form class="stack-form checkin-form" @submit.prevent="submitItem">
          <label>
            {{ fish.t("打卡项") }}
            <input v-model="form.title" required maxlength="30" :placeholder="fish.t('例如：每日背单词')" />
          </label>
          <label>
            {{ fish.t("打卡方式") }}
            <select v-model="form.kind">
              <option v-for="kind in checkinKinds" :key="kind.id" :value="kind.id">{{ fish.t(kind.label) }}</option>
            </select>
          </label>
          <label v-if="form.kind === 'number'">
            {{ fish.t("目标数值") }}
            <input v-model.number="form.target" min="0" step="any" type="number" />
          </label>
          <label v-if="form.kind === 'number'">
            {{ fish.t("单位") }}
            <input v-model="form.unit" maxlength="10" :placeholder="fish.t('个 / kg / 页')" />
          </label>
          <button class="primary-button">{{ fish.t("添加打卡项") }}</button>
          <p class="form-hint">{{ fish.t("可用于每日背单词至少50个、记录体重、每日阅读等。") }}</p>
        </form>

        <div class="checkin-manage-list">
          <article v-for="item in fish.state.dailyCheckins" :key="item.id" class="checkin-manage-item">
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <label>{{ fish.t("打卡项") }}<input v-model="editForm.title" required maxlength="30" /></label>
              <label>{{ fish.t("打卡方式") }}<select v-model="editForm.kind"><option v-for="kind in checkinKinds" :key="kind.id" :value="kind.id">{{ fish.t(kind.label) }}</option></select></label>
              <label v-if="editForm.kind === 'number'">{{ fish.t("目标数值") }}<input v-model.number="editForm.target" min="0" step="any" type="number" /></label>
              <label v-if="editForm.kind === 'number'">{{ fish.t("单位") }}<input v-model="editForm.unit" maxlength="10" /></label>
              <div class="row-actions wide-field">
                <button class="primary-button">{{ fish.t("保存") }}</button>
                <button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button>
              </div>
            </form>
            <template v-else>
              <div>
                <strong>{{ fish.tx(item.title) }}</strong>
                <small>{{ targetText(item) }}</small>
              </div>
              <div class="row-actions">
                <button type="button" @click="fish.updateDailyCheckin(item.id, { active: item.active === false })">
                  {{ item.active === false ? fish.t("启用") : fish.t("停用") }}
                </button>
                <button type="button" @click="startEdit(item)">{{ fish.t("编辑") }}</button>
                <button class="is-delete" type="button" @click="deleteItem(item)">{{ fish.t("删除") }}</button>
              </div>
            </template>
          </article>
        </div>
      </section>
    </div>

    <section class="panel checkin-history">
      <div class="section-heading-row">
        <div>
          <p class="panel-kicker">{{ fish.t("最近 7 天") }}</p>
          <h3>{{ fish.t("打卡连续感") }}</h3>
        </div>
      </div>
      <div class="checkin-day-grid">
        <button
          v-for="day in recentDays"
          :key="day.date"
          class="checkin-day"
          :class="{ 'is-selected': selectedDate === day.date, 'is-full': day.total && day.done === day.total }"
          type="button"
          @click="selectedDate = day.date"
        >
          <strong>{{ day.date.slice(5) }}</strong>
          <span>{{ day.done }}/{{ day.total }}</span>
          <i :style="{ height: day.pct + '%' }"></i>
        </button>
      </div>
    </section>
  </section>
</template>
