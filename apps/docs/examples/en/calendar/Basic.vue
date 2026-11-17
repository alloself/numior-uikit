<template>
  <div class="flex flex-col gap-3">
    <NuiCalendar
      v-model="delivery"
      today="2026-09-27"
      min="2026-09-28"
      :is-date-disabled="isWeekend"
    />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiCalendar, weekdayOf, type NuiCalendarValue } from '@numior/kit';

const dayFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const delivery = ref<NuiCalendarValue>('2026-09-30');

const summary = computed(() =>
  typeof delivery.value === 'string'
    ? `We deliver on ${dayFormat.format(new Date(delivery.value))}.`
    : 'Choose a delivery day.',
);

const isWeekend = (day: string): boolean => weekdayOf(day) >= 6;
</script>
