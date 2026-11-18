<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>День доставки</NuiCardTitle>
      <NuiCardDescription>{{ summary }}</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent class="flex justify-center">
      <NuiCalendar
        v-model="day"
        today="2026-09-27"
        min="2026-09-28"
        :is-date-disabled="isWeekend"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiCalendar,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  weekdayOf,
  type NuiCalendarValue,
} from '@numior/kit';

const SATURDAY = 6;

const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const day = ref<NuiCalendarValue>('2026-09-30');

const summary = computed(() =>
  typeof day.value === 'string'
    ? `Курьер приедет ${dayFormat.format(new Date(day.value))}`
    : 'Выберите будний день',
);

const isWeekend = (date: string): boolean => weekdayOf(date) >= SATURDAY;
</script>
