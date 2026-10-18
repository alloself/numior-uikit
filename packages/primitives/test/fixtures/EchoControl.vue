<template>
  <span>{{ modelValue }}</span>
</template>

<script setup lang="ts">
const { modelValue = '' } = defineProps<{
  modelValue?: string | undefined;
}>();
</script>
