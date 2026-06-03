import { ref } from "vue";

export function useToast() {
  const message = ref("");
  let timer = null;

  function showToast(nextMessage) {
    message.value = nextMessage;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      message.value = "";
    }, 5000);
  }

  return { message, showToast };
}
