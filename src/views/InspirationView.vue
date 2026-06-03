<script setup>
import { reactive, ref } from "vue";
import BilingualTextEditor from "../components/BilingualTextEditor.vue";
import ExportActions from "../components/ExportActions.vue";
import { handleBoldKeydown } from "../utils/textFormat.js";

const props = defineProps({ fish: { type: Object, required: true } });

const categories = ["梦想生活", "想成为的人", "座右铭", "动力源泉", "其他"];

const form = reactive({ title: "", content: "", category: "梦想生活" });
const editingId = ref("");
const editForm = reactive({ title: "", content: "", category: "" });
const filterCategory = ref("");

function submit() {
  props.fish.addInspiration({ ...form });
  form.title = "";
  form.content = "";
  form.category = "梦想生活";
}

function startEdit(item) {
  editingId.value = item.id;
  Object.assign(editForm, {
    title: props.fish.textSource(item.title),
    content: props.fish.textSource(item.content),
    category: item.category || "梦想生活",
  });
}

function saveEdit(id) {
  props.fish.updateById("inspirations", id, { ...editForm });
  editingId.value = "";
}

const filteredItems = () => {
  const items = props.fish.state.inspirations || [];
  if (!filterCategory.value) return items;
  return items.filter((item) => item.category === filterCategory.value);
};
</script>

<template>
  <section class="page-view">
    <div class="topbar">
      <div>
        <p class="eyebrow">Inspiration</p>
        <h2>{{ fish.t("激励") }}</h2>
      </div>
      <ExportActions
        :title="fish.t('激励')"
        :payload="fish.state.inspirations"
        :rows="fish.state.inspirations.map((item) => ({
          [fish.t('日期')]: item.date,
          [fish.t('标题')]: fish.tx(item.title),
          [fish.t('分类')]: fish.t(item.category || ''),
          [fish.t('内容')]: fish.tx(item.content),
        }))"
      />
    </div>

    <div class="split-layout">
      <section class="panel">
        <p class="panel-kicker">Capture</p>
        <h3>{{ fish.t("记录激励") }}</h3>
        <form class="stack-form" @submit.prevent="submit">
          <label>
            {{ fish.t("标题") }}
            <input v-model="form.title" required :placeholder="fish.t('比如：我梦想中的书房')" />
          </label>
          <label>
            {{ fish.t("分类") }}
            <select v-model="form.category">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ fish.t(cat) }}</option>
            </select>
          </label>
          <label class="wide-field">
            {{ fish.t("内容") }}
            <textarea
              v-model="form.content"
              rows="6"
              :placeholder="fish.t('描述你向往的生活、你想成为的样子……越具体越好。Ctrl+B 加粗重点')"
              @keydown="handleBoldKeydown"
            ></textarea>
          </label>
          <button class="primary-button">{{ fish.t("保存") }}</button>
        </form>
      </section>

      <section class="panel">
        <p class="panel-kicker">Vision</p>
        <h3>{{ fish.t("我的激励墙") }}</h3>

        <div class="filter-row" v-if="fish.state.inspirations.length > 1">
          <select v-model="filterCategory" class="filter-select">
            <option value="">{{ fish.t("全部") }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ fish.t(cat) }}</option>
          </select>
        </div>

        <div class="item-list">
          <article
            v-for="item in filteredItems()"
            :key="item.id"
            class="list-item inspiration-card"
          >
            <form v-if="editingId === item.id" class="inline-edit-form" @submit.prevent="saveEdit(item.id)">
              <label>
                {{ fish.t("标题") }}
                <input v-model="editForm.title" required />
              </label>
              <label>
                {{ fish.t("分类") }}
                <select v-model="editForm.category">
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ fish.t(cat) }}</option>
                </select>
              </label>
              <label class="wide-field">
                {{ fish.t("内容") }}
                <textarea v-model="editForm.content" rows="5" @keydown="handleBoldKeydown"></textarea>
              </label>
              <div class="row-actions wide-field">
                <button class="primary-button">{{ fish.t("保存") }}</button>
                <button class="secondary-button" type="button" @click="editingId = ''">
                  {{ fish.t("取消") }}
                </button>
              </div>
            </form>
            <template v-else>
              <div class="inspiration-body">
                <div class="inspiration-header">
                  <strong>
                    <BilingualTextEditor
                      :fish="fish"
                      :value="item.title"
                      @save="(title) => fish.updateTranslation('inspirations', item.id, 'title', title)"
                      v-slot="{ text }"
                    >
                      <span v-html="fish.renderBold(text)"></span>
                    </BilingualTextEditor>
                  </strong>
                  <span class="inspiration-category">{{ fish.t(item.category) }}</span>
                </div>
                <p class="inspiration-content">
                  <BilingualTextEditor
                    :fish="fish"
                    :value="item.content"
                    textarea
                    @save="(content) => fish.updateTranslation('inspirations', item.id, 'content', content)"
                    v-slot="{ text }"
                  >
                    <span v-html="fish.renderBold(text)"></span>
                  </BilingualTextEditor>
                </p>
                <small class="inspiration-date">{{ item.date }}</small>
              </div>
              <div class="row-actions">
                <button @click="startEdit(item)">{{ fish.t("编辑") }}</button>
                <button class="is-delete" @click="fish.deleteById('inspirations', item.id)">
                  {{ fish.t("删除") }}
                </button>
              </div>
            </template>
          </article>

          <p v-if="!fish.state.inspirations.length" class="empty-hint">
            {{ fish.t("还没有激励卡片，在左侧写下你的第一张吧。") }}
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
