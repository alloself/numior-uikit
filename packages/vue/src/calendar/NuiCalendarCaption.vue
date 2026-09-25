<template>
  <div class="nui-calendar__caption">
    <NuiButton
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-calendar__nav nui-calendar__nav--previous"
      :class="{ 'nui-calendar__nav--hidden': !first }"
      :aria-label="labels.previous"
      :tabindex="first ? undefined : -1"
      @click="calendar.shift(-1)"
    >
      <NuiIcon alias="chevron-left" class="nui-calendar__arrow" />
    </NuiButton>
    <div :id="captionId" class="nui-calendar__title" aria-live="polite">
      <button
        v-for="part in parts"
        :key="part.view"
        type="button"
        class="nui-calendar__title-button"
        :class="`nui-calendar__title-button--${part.view === 'months' ? 'month' : 'year'}`"
        :aria-label="part.label"
        :aria-expanded="calendar.view.value === part.view"
        :aria-controls="calendar.view.value === part.view ? pickerId : undefined"
        @click="toggleView(part.view)"
      >
        {{ part.text }}
      </button>
    </div>
    <NuiButton
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-calendar__nav nui-calendar__nav--next"
      :class="{ 'nui-calendar__nav--hidden': !last }"
      :aria-label="labels.next"
      :tabindex="last ? undefined : -1"
      @click="calendar.shift(1)"
    >
      <NuiIcon alias="chevron-right" class="nui-calendar__arrow" />
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatDateLabel } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useCalendar } from './calendar-context';
import type { NuiCalendarView } from './calendar.types';

interface TitlePart {
  readonly view: 'months' | 'years';
  readonly label: string;
  readonly text: string;
}

const { month, captionId, first, last } = defineProps<{
  month: string;
  captionId: string;
  first: boolean;
  last: boolean;
}>();

const calendar = useCalendar();
const labels = computed(() => calendar.labels());
const pickerId = computed(() => `${calendar.id.value}-picker`);

const parts = computed<TitlePart[]>(() => [
  {
    view: 'months',
    label: labels.value.month,
    text: formatDateLabel(`${month}-01`, calendar.locale.value, { month: 'long' }),
  },
  {
    view: 'years',
    label: labels.value.year,
    text: formatDateLabel(`${month}-01`, calendar.locale.value, { year: 'numeric' }),
  },
]);

const toggleView = (view: NuiCalendarView): void => {
  calendar.setView(calendar.view.value === view ? 'days' : view);
};
</script>
