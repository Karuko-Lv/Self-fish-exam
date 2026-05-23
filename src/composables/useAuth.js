import { ref } from "vue";

export function useAuth(showToast) {
  const user = ref(null);
  const loading = ref(true);
  const loginLoading = ref(false);

  async function checkSession() {
    loading.value = true;
    try {
      const response = await fetch("/api/me", { credentials: "same-origin" });
      const payload = await response.json();
      user.value = payload.user || null;
    } catch {
      user.value = null;
      showToast?.("暂时无法连接服务器，请稍后重试。");
    } finally {
      loading.value = false;
    }
  }

  async function login(username, password) {
    loginLoading.value = true;
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "登录失败");
      user.value = payload.user;
      showToast?.(`欢迎回来，${payload.user.name}`);
      return true;
    } catch (error) {
      showToast?.(error.message || "登录失败，请检查账号密码。");
      return false;
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    user.value = null;
    showToast?.("已退出登录。");
  }

  return { user, loading, loginLoading, checkSession, login, logout };
}
