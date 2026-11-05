<template>
  <a :href="`/route${to.path}`"><slot /></a>
</template>

<script setup lang="ts">
const { to } = defineProps<{ to: { path: string } }>();
</script>
