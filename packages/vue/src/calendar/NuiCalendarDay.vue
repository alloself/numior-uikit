<template>
  <td
    role="gridcell"
    class="nui-calendar__cell"
    :class="{
      'nui-calendar__cell--range-start': state.start,
      'nui-calendar__cell--range-end': state.end,
      'nui-calendar__cell--range-middle': state.middle,
      'nui-calendar__cell--preview': state.preview,
    }"
    :aria-selected="state.selected || undefined"
  >
    <button
      v-if="calendar.showOutsideDays() || !state.outside"
      type="button"
      class="nui-calendar__day"
      :class="{
        'nui-calendar__day--selected': state.selected && !state.middle,
        'nui-calendar__day--today': state.today,
        'nui-calendar__day--outside': state.outside,
        'nui-calendar__day--disabled': state.disabled,
      }"
      :tabindex="date === calendar.focused.value ? 0 : -1"
      :aria-label="formatDateLabel(date, calendar.locale.value)"
      :aria-disabled="state.disabled || undefined"
      :aria-current="state.today ? 'date' : undefined"
      @click="act(calendar.click)"
      @pointerdown="arm"
      @pointerup="act(calendar.release)"
      @pointerenter="calendar.hover(date)"
    >
      <time :datetime="date">{{ formatDayNumber(dayOf(date), calendar.locale.value) }}</time>
    </button>
  </td>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { PointerType, formatDateLabel, formatDayNumber } from '@numior/primitives';
import { useCalendar } from './calendar-context';

const dayOf = (date: string): number => Number(date.slice(8, 10));

const { date, month } = defineProps<{ date: string; month: string }>();

const calendar = useCalendar();
const state = computed(() => calendar.dayState(date, month));

const act = (action: (date: string) => void): void => {
  if (state.value.disabled) {
    return;
  }

  action(date);
};

const arm = (event: PointerEvent): void => {
  if (event.pointerType === PointerType.Touch) {
    return;
  }

  act(calendar.arm);
};
</script>
