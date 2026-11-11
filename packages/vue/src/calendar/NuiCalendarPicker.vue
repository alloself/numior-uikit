<template>
  <div
    :id="`${calendar.id.value}-${month}-picker`"
    ref="root"
    class="nui-calendar__picker"
    role="group"
    :aria-label="kind === NuiCalendarView.Months ? calendar.labels().month : calendar.labels().year"
    @keydown="onKeydown"
  >
    <button
      v-for="(option, index) in options"
      :key="option.key"
      type="button"
      class="nui-calendar__option"
      :class="{
        'nui-calendar__option--active': index === activeIndex,
        'nui-calendar__option--selected': option.key === current,
      }"
      :tabindex="index === activeIndex ? 0 : -1"
      @click="choose(option.key)"
    >
      <time :datetime="option.key">{{ option.label }}</time>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  CellMove,
  Key,
  cellMoveFor,
  cellTargetIndex,
  formatDayNumber,
  monthLabels,
} from '@numior/primitives';
import { NuiCalendarView, type CalendarPickerKind } from './calendar.types';
import { useCalendar } from './calendar-context';
import { yearOfKey, yearsOn } from './use-calendar-view';

interface PickerOption {
  readonly key: string;
  readonly label: string;
}

const COLUMNS = 3;

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

const { kind, month } = defineProps<{ kind: CalendarPickerKind; month: string }>();

const calendar = useCalendar();
const root = useTemplateRef<HTMLElement>('root');
const active = ref<number>();

const options = computed<PickerOption[]>(() => {
  if (kind === NuiCalendarView.Months) {
    const year = yearOfKey(calendar.month.value);

    return monthLabels(calendar.locale.value, 'short').map((label, index) => ({
      key: `${pad(year, 4)}-${pad(index + 1)}`,
      label,
    }));
  }

  return yearsOn(calendar.yearPage.value).map((year) => ({
    key: String(year),
    label: formatDayNumber(year, calendar.locale.value),
  }));
});

const current = computed(() =>
  kind === NuiCalendarView.Months ? calendar.month.value : String(yearOfKey(calendar.month.value)),
);

const activeIndex = computed(() => {
  if (active.value !== undefined) {
    return active.value;
  }

  const index = options.value.findIndex((option) => option.key === current.value);

  return index < 0 ? 0 : index;
});

const focusActive = (): void => {
  const button = root.value?.querySelectorAll('button')[activeIndex.value];

  button?.focus({ preventScroll: true });
};

const choose = (key: string): void => {
  if (kind === NuiCalendarView.Months) {
    calendar.pickMonth(key);
  } else {
    calendar.pickYear(Number(key));
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape) {
    event.preventDefault();
    calendar.setView(NuiCalendarView.Days);

    return;
  }

  const move = cellMoveFor(event.key, calendar.isRtl());

  if (!move) {
    return;
  }

  event.preventDefault();

  if (move === CellMove.PagePrev || move === CellMove.PageNext) {
    calendar.shift(move === CellMove.PagePrev ? -1 : 1);
    active.value = activeIndex.value;

    return;
  }

  active.value = cellTargetIndex(move, activeIndex.value, options.value.length, COLUMNS);
};

onMounted(() => {
  focusActive();
  watch(active, () => focusActive(), { flush: 'post' });
});
</script>
