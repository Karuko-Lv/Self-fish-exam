<script setup>
import { onMounted, watch } from "vue";
import AppShell from "./components/AppShell.vue";
import LoginScreen from "./components/LoginScreen.vue";
import ToastHost from "./components/ToastHost.vue";
import { useAuth } from "./composables/useAuth.js";
import { useSelfFishState } from "./composables/useSelfFishState.js";
import { useToast } from "./composables/useToast.js";

const toast = useToast();
const auth = useAuth(toast.showToast);
const fish = useSelfFishState(auth.user, toast.showToast);

onMounted(async () => {
  await auth.checkSession();
});

watch(
  () => auth.user.value?.id,
  async (userId) => {
    if (userId) {
      await fish.initialize();
      fish.maybeResetDailyTasks();
    }
  },
);
</script>

<template>
  <LoginScreen
    v-if="!auth.loading.value && !auth.user.value"
    :loading="auth.loginLoading.value"
    @login="({ username, password }) => auth.login(username, password)"
  />
  <div v-else-if="auth.loading.value" class="loading-screen">
    <div class="kitty-loader"></div>
    <p>正在检查登录状态...</p>
  </div>
  <AppShell
    v-else
    :user="auth.user.value"
    :fish="fish"
    @logout="auth.logout"
  />
  <ToastHost :message="toast.message.value" />
</template>
