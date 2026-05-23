<script setup>
import { reactive } from "vue";

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["login"]);
const form = reactive({ username: "", password: "" });

function submit() {
  emit("login", { ...form });
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="kitty-face" aria-hidden="true"><span></span></div>
      <p class="eyebrow">Kitty Cloud Sync</p>
      <h1 id="login-title">加油小小鱼</h1>
      <p class="login-copy">登录后，手机、平板、电脑都会同步同一份学习数据。</p>
      <form class="stack-form" @submit.prevent="submit">
        <label>
          账号
          <input v-model.trim="form.username" autocomplete="username" required placeholder="fish / kitty" />
        </label>
        <label>
          密码
          <input v-model="form.password" type="password" autocomplete="current-password" required placeholder="输入密码" />
        </label>
        <button class="primary-button wide-button" type="submit" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
      </form>
      <p class="login-hint">账号由服务器配置，暂不开放注册。</p>
    </section>
  </main>
</template>
