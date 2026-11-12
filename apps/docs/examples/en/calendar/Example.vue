<template>
  <NuiCalendar v-model="delivery" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCalendar, type NuiCalendarValue } from '@numior/vue';

const delivery = ref<NuiCalendarValue>('2026-09-30');
</script>
