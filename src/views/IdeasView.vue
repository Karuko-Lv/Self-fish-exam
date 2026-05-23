<script setup>
import { reactive } from "vue";

const props = defineProps({ fish: { type: Object, required: true } });
const form = reactive({ text: "", reason: "" });

function submit() {
  props.fish.addIdea({ ...form });
  form.text = "";
  form.reason = "";
}
</script>

<template>
  <section class="page-view">
    <div class="topbar"><div><p class="eyebrow">Parking</p><h2>灵感停车场</h2></div></div>
    <div class="split-layout">
      <section class="panel"><p class="panel-kicker">Capture</p><h3>先停一下</h3><form class="stack-form" @submit.prevent="submit"><label>我突然想做<input v-model="form.text" required maxlength="70" /></label><label>为什么吸引我<textarea v-model="form.reason" rows="4" maxlength="160"></textarea></label><button class="primary-button">停车</button></form></section>
      <section class="panel"><p class="panel-kicker">Ideas</p><h3>等周末再审</h3><div class="item-list"><article v-for="idea in fish.state.ideas" :key="idea.id" class="list-item"><div><strong>{{ idea.text }}</strong><small>{{ idea.date }} · {{ idea.parked ? '停车中' : '已转任务' }}</small><p>{{ idea.reason }}</p></div><div class="row-actions"><button @click="fish.convertIdeaToTask(idea.id)">转任务</button><button @click="fish.deleteById('ideas', idea.id)">删除</button></div></article></div></section>
    </div>
  </section>
</template>
