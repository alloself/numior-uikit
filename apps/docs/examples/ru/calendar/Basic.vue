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
import { weekdayOf } from '@numior/primitives';
import { NuiCalendar, type NuiCalendarValue } from '@numior/vue';

const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const delivery = ref<NuiCalendarValue>('2026-09-30');

const summary = computed(() =>
  typeof delivery.value === 'string'
    ? `Доставим ${dayFormat.format(new Date(delivery.value))}.`
    : 'Выберите день доставки.',
);

const isWeekend = (day: string): boolean => weekdayOf(day) >= 6;
</script>
