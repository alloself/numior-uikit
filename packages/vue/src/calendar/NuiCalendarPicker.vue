<template>
  <div
    :id="`${calendar.id.value}-${month}-picker`"
    ref="root"
    class="nui-calendar__picker"
    role="group"
    :aria-label="kind === 'months' ? calendar.labels().month : calendar.labels().year"
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
import { cellMoveFor, cellTargetIndex, formatDayNumber, monthLabels } from '@numior/primitives';
import { useCalendar } from './calendar-context';
import { yearOfKey } from './use-calendar-view';

interface PickerOption {
  readonly key: string;
  readonly label: string;
}

const COLUMNS = 3;

const pad = (value: number): string => String(value).padStart(2, '0');

const { kind, month } = defineProps<{ kind: 'months' | 'years'; month: string }>();

const calendar = useCalendar();
const root = useTemplateRef<HTMLElement>('root');
const active = ref<number>();

const options = computed<PickerOption[]>(() => {
  if (kind === 'months') {
    const year = yearOfKey(calendar.month.value);

    return monthLabels(calendar.locale.value, 'short').map((label, index) => ({
      key: `${year}-${pad(index + 1)}`,
      label,
    }));
  }

  return Array.from({ length: 12 }, (_, offset) => {
    const year = calendar.yearPage.value + offset;

    return { key: String(year), label: formatDayNumber(year, calendar.locale.value) };
  });
});

const current = computed(() =>
  kind === 'months' ? calendar.month.value : String(yearOfKey(calendar.month.value)),
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
  if (kind === 'months') {
    calendar.pickMonth(key);
  } else {
    calendar.pickYear(Number(key));
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault();
    calendar.setView('days');

    return;
  }

  const move = cellMoveFor(event.key, calendar.isRtl());

  if (!move) {
    return;
  }

  event.preventDefault();

  if (move === 'page-prev' || move === 'page-next') {
    calendar.shift(move === 'page-prev' ? -1 : 1);
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
