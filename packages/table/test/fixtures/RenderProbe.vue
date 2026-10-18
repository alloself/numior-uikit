<template>
  <p>{{ read() }}</p>
</template>

<script setup lang="ts">
const { read } = defineProps<{ read: () => string }>();
</script>
