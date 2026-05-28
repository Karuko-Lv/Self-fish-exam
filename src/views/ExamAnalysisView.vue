<script setup>
import { computed, reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";

const props = defineProps({ fish: { type: Object, required: true } });
const defaultYear = String(new Date().getFullYear());
const form = reactive({
  university: "", major: "", subjects: "", note: "",
  yearRecords: [{ year: defaultYear, enrollment: null, scoreLine: null }],
});
const editingId = ref("");
const editForm = reactive({
  university: "", major: "", subjects: "", note: "",
  yearRecords: [],
});

const count = computed(() => props.fish.state.examAnalyses.length);
const exportRows = computed(() => {
  const rows = [];
  props.fish.state.examAnalyses.forEach((item) => {
    item.yearRecords.forEach((yr) => {
      rows.push({
        学校: props.fish.tx(item.university),
        专业: props.fish.tx(item.major),
        年份: yr.year,
        考试科目: item.subjects,
        招生人数: yr.enrollment || "--",
        复试线: yr.scoreLine || "--",
        备注: props.fish.tx(item.note),
      });
    });
  });
  return rows;
});

function addYearRow(target) {
  target.push({ year: defaultYear, enrollment: null, scoreLine: null });
}
function removeYearRow(target, index) {
  if (target.length > 1) target.splice(index, 1);
}

function submit() {
  props.fish.addExamAnalysis({
    university: form.university,
    major: form.major,
    subjects: form.subjects,
    note: form.note,
    yearRecords: [...form.yearRecords],
  });
  form.university = "";
  form.major = "";
  form.subjects = "";
  form.note = "";
  form.yearRecords = [{ year: defaultYear, enrollment: null, scoreLine: null }];
}

function startEdit(item) {
  editingId.value = item.id;
  editForm.university = props.fish.textSource(item.university);
  editForm.major = props.fish.textSource(item.major);
  editForm.subjects = item.subjects;
  editForm.note = props.fish.textSource(item.note);
  editForm.yearRecords = item.yearRecords.map((yr) => ({ ...yr }));
}

function saveEdit(id) {
  props.fish.updateById("examAnalyses", id, {
    university: editForm.university,
    major: editForm.major,
    subjects: editForm.subjects,
    note: editForm.note,
    yearRecords: [...editForm.yearRecords],
  });
  editingId.value = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Exam Analysis</p>
        <h2>{{ fish.t("考情分析") }}</h2>
      </div>
      <div class="practice-metrics">
        <span class="metric-pill">{{ fish.t("共") }} {{ count }} {{ fish.t("条记录") }}</span>
        <ExportActions
          :title="fish.t('考情分析')"
          :payload="fish.state.examAnalyses"
          :rows="exportRows"
        />
      </div>
    </div>
    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Log</p>
        <h3>{{ fish.t("新增考情") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>{{ fish.t("学校") }}<input v-model="form.university" required maxlength="40" /></label>
          <label>{{ fish.t("专业") }}<input v-model="form.major" required maxlength="40" /></label>
          <label>{{ fish.t("考试科目") }}<input v-model="form.subjects" maxlength="80" placeholder="数一+英一+408" /></label>
          <fieldset class="year-records-fieldset">
            <legend>{{ fish.t("年份数据") }}</legend>
            <div v-for="(yr, idx) in form.yearRecords" :key="idx" class="year-record-row">
              <label>{{ fish.t("年份") }}<input v-model="yr.year" required maxlength="10" /></label>
              <label>{{ fish.t("招生人数") }}<input v-model.number="yr.enrollment" type="number" min="0" /></label>
              <label>{{ fish.t("复试线") }}<input v-model.number="yr.scoreLine" type="number" min="0" /></label>
              <button type="button" class="small-button" :disabled="form.yearRecords.length <= 1" @click="removeYearRow(form.yearRecords, idx)">{{ fish.t("移除") }}</button>
            </div>
            <button type="button" class="secondary-button" @click="addYearRow(form.yearRecords)">+ {{ fish.t("添加年份") }}</button>
          </fieldset>
          <label>{{ fish.t("分析备注") }}<textarea v-model="form.note" rows="3" maxlength="280"></textarea></label>
          <button class="primary-button" type="submit">{{ fish.t("记录考情") }}</button>
        </form>
      </section>
      <section class="panel">
        <p class="panel-kicker">History</p>
        <h3>{{ fish.t("最近考情") }}</h3>
        <div class="item-list">
          <p v-if="!fish.state.examAnalyses.length" class="empty-note">{{ fish.t("暂无考情记录") }}</p>
          <article v-for="item in fish.state.examAnalyses" :key="item.id" class="list-item">
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <label>{{ fish.t("学校") }}<input v-model="editForm.university" required maxlength="40" /></label>
              <label>{{ fish.t("专业") }}<input v-model="editForm.major" required maxlength="40" /></label>
              <label class="wide-field">{{ fish.t("考试科目") }}<input v-model="editForm.subjects" maxlength="80" /></label>
              <fieldset class="year-records-fieldset wide-field">
                <legend>{{ fish.t("年份数据") }}</legend>
                <div v-for="(yr, idx) in editForm.yearRecords" :key="idx" class="year-record-row">
                  <label>{{ fish.t("年份") }}<input v-model="yr.year" required maxlength="10" /></label>
                  <label>{{ fish.t("招生人数") }}<input v-model.number="yr.enrollment" type="number" min="0" /></label>
                  <label>{{ fish.t("复试线") }}<input v-model.number="yr.scoreLine" type="number" min="0" /></label>
                  <button type="button" class="small-button" :disabled="editForm.yearRecords.length <= 1" @click="removeYearRow(editForm.yearRecords, idx)">{{ fish.t("移除") }}</button>
                </div>
                <button type="button" class="secondary-button" @click="addYearRow(editForm.yearRecords)">+ {{ fish.t("添加年份") }}</button>
              </fieldset>
              <label class="wide-field">{{ fish.t("分析备注") }}<textarea v-model="editForm.note" rows="3" maxlength="280"></textarea></label>
              <div class="row-actions wide-field">
                <button class="primary-button">{{ fish.t("保存") }}</button>
                <button class="secondary-button" type="button" @click="editingId = ''">{{ fish.t("取消") }}</button>
              </div>
            </form>
            <template v-else>
              <div>
                <strong><BilingualTextEditor :fish="fish" :value="item.university" @save="(text) => fish.updateTranslation('examAnalyses', item.id, 'university', text)" /></strong>
                <small>
                  <BilingualTextEditor :fish="fish" :value="item.major" @save="(text) => fish.updateTranslation('examAnalyses', item.id, 'major', text)" />
                  <template v-if="item.subjects"> · {{ item.subjects }}</template>
                </small>
                <div class="year-data-table">
                  <table>
                    <thead><tr><th>{{ fish.t("年份") }}</th><th>{{ fish.t("招生人数") }}</th><th>{{ fish.t("复试线") }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(yr, idx) in item.yearRecords" :key="idx">
                        <td>{{ yr.year }}</td>
                        <td>{{ yr.enrollment || "--" }}</td>
                        <td>{{ yr.scoreLine || "--" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p><BilingualTextEditor :fish="fish" :value="item.note" textarea @save="(text) => fish.updateTranslation('examAnalyses', item.id, 'note', text)" /></p>
              </div>
              <div class="row-actions">
                <button type="button" @click="startEdit(item)">{{ fish.t("编辑") }}</button>
                <button type="button" @click="fish.deleteById('examAnalyses', item.id)">{{ fish.t("删除") }}</button>
              </div>
            </template>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
