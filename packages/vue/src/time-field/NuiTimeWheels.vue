<template>
  <div
    v-if="available"
    ref="wheels"
    class="nui-time-field__wheels"
    @keydown="navigation.onKeydown"
    @focusin="onFocusin"
  >
    <template v-for="(column, index) in columns" :key="column.type">
      <span v-if="column.separator" class="nui-time-field__wheel-separator" aria-hidden="true">
        {{ column.separator }}
      </span>
      <NuiTimeWheel
        ref="wheel"
        :options="column.options"
        :selected="column.selected"
        :label="labels[column.type]"
        :tab-stop="index === 0"
        @pick="emit('pick', column.type, $event)"
      />
    </template>
  </div>
  <p v-else class="nui-time-field__empty">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useListNavigation, type TimeSegmentType } from '@numior/primitives';
import NuiTimeWheel from './NuiTimeWheel.vue';
import type { NuiTimeWheelsProps } from './time-field.types';
import { hasWheelTimes } from './time-wheels';

const { columns, labels, emptyText } = defineProps<NuiTimeWheelsProps>();

const emit = defineEmits<{
  pick: [type: TimeSegmentType, index: number];
  focusWheel: [type: TimeSegmentType];
}>();

const wheelsElement = useTemplateRef<HTMLDivElement>('wheels');
const wheelRefs = useTemplateRef<{ reveal: () => void }[]>('wheel');

const available = computed(() => hasWheelTimes(columns));

const navigation = useListNavigation(wheelsElement, {
  selector: '.nui-time-field__wheel',
  orientation: 'horizontal',
  loop: false,
  typeahead: false,
  rtl: false,
});

const onFocusin = (event: FocusEvent): void => {
  const index = event.target instanceof HTMLElement ? navigation.items().indexOf(event.target) : -1;
  const column = columns[index];

  if (column) {
    emit('focusWheel', column.type);
  }
  navigation.onFocusin(event);
};

const focus = (type: TimeSegmentType): void => {
  const index = columns.findIndex((column) => column.type === type);
  navigation.setActive(Math.max(0, index));
};

const reveal = (): void => {
  for (const wheel of wheelRefs.value ?? []) {
    wheel.reveal();
  }
};

defineExpose({ focus, reveal });
</script>
