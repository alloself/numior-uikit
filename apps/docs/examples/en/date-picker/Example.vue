<template>
  <NuiDatePicker v-model="delivery" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const delivery = ref<string | null>('2026-09-30');
</script>
