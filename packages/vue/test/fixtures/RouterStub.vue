<template>
  <a :href="`/router${to}`"><slot /></a>
</template>

<script setup lang="ts">
const { to } = defineProps<{ to: string }>();
</script>
