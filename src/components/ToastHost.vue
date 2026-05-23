<script setup>
defineProps({
  message: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="toast" :class="{ 'is-visible': message }" role="status" aria-live="polite">
    {{ message }}
  </div>
</template>
