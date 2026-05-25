<script setup>
import { ref } from "vue";

const props = defineProps({
  fish: { type: Object, required: true },
  value: { type: [Object, String], default: "" },
  textarea: { type: Boolean, default: false },
});

const emit = defineEmits(["save"]);
const editing = ref(false);
const draft = ref("");

function startEdit() {
  draft.value = props.fish.tx(props.value);
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  draft.value = "";
}

function saveEdit() {
  emit("save", draft.value);
  editing.value = false;
}
</script>

<template>
  <span class="bilingual-text-editor">
    <template v-if="editing">
      <textarea v-if="textarea" v-model="draft" rows="3" />
      <input v-else v-model="draft" />
      <span class="translation-actions">
        <button class="small-button" type="button" @click="saveEdit">{{ fish.t("保存译文") }}</button>
        <button class="secondary-button" type="button" @click="cancelEdit">{{ fish.t("取消") }}</button>
      </span>
    </template>
    <template v-else>
      <span><slot :text="fish.tx(value)">{{ fish.tx(value) }}</slot></span>
      <button v-if="fish.isEnglish.value" class="translation-edit-button" type="button" @click="startEdit">
        {{ fish.t("修改译文") }}
      </button>
    </template>
  </span>
</template>
