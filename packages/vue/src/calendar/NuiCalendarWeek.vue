<template>
  <tr class="nui-calendar__row">
    <th v-if="calendar.weekNumbers()" scope="row" class="nui-calendar__week">
      {{ formatDayNumber(weekNumberOfRow(row), calendar.locale.value) }}
    </th>
    <template v-for="(date, weekday) in row" :key="weekday">
      <NuiCalendarDay v-if="date !== null" :date="date" :month="month" />
      <td v-else class="nui-calendar__cell" />
    </template>
  </tr>
</template>

<script setup lang="ts">
import { formatDayNumber, weekNumberOfRow } from '@numior/primitives';
import NuiCalendarDay from './NuiCalendarDay.vue';
import { useCalendar } from './calendar-context';

const { row, month } = defineProps<{ row: readonly (string | null)[]; month: string }>();

const calendar = useCalendar();
</script>
