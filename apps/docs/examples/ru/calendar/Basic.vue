<template>
  <div class="flex flex-col gap-3">
    <NuiCalendar
      v-model="date"
      today="2026-09-27"
      min="2026-09-02"
      week-numbers
      :is-date-disabled="isWeekend"
    />
    <p class="text-sm text-muted-foreground">Выбрано: {{ date ?? '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCalendar, weekdayOf, type NuiCalendarValue } from '@numior/vue';

const date = ref<NuiCalendarValue>('2026-09-30');
const isWeekend = (day: string): boolean => weekdayOf(day) >= 6;
</script>
