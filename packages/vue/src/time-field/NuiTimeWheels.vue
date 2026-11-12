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
        :ref="bindWheel(column.type)"
        :options="column.options"
        :selected="column.selected"
        :label="labels[column.type]"
        :tab-stop="index === 0"
        @select="emit('select', column.type, $event)"
      />
    </template>
  </div>
  <p v-else class="nui-time-field__empty">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
  createCollection,
  useListNavigation,
  type ElementRef,
  type TimeSegmentType,
} from '@numior/primitives';
import NuiTimeWheel from './NuiTimeWheel.vue';
import type { NuiTimeWheelsProps } from './time-field.types';
import { hasWheelTimes } from './time-wheels';

interface WheelHandle {
  reveal(): void;
}

const isWheel = (value: unknown): value is WheelHandle =>
  typeof value === 'object' &&
  value !== null &&
  'reveal' in value &&
  typeof value.reveal === 'function';

const { columns, labels, emptyText } = defineProps<NuiTimeWheelsProps>();

const emit = defineEmits<{
  select: [type: TimeSegmentType, index: number];
  focusWheel: [type: TimeSegmentType];
}>();

const wheelsElement = useTemplateRef<HTMLDivElement>('wheels');
const wheelItems = createCollection<TimeSegmentType>();
const reveals = new Map<TimeSegmentType, () => void>();
const binders = new Map<TimeSegmentType, ElementRef>();

const bindWheel = (type: TimeSegmentType): ElementRef => {
  const known = binders.get(type);

  if (known !== undefined) {
    return known;
  }

  const register = wheelItems.ref(type);

  const bind: ElementRef = (value) => {
    register(value);

    if (isWheel(value)) {
      reveals.set(type, () => value.reveal());
    } else {
      reveals.delete(type);
    }
  };

  binders.set(type, bind);

  return bind;
};

const available = computed(() => hasWheelTimes(columns));

const navigation = useListNavigation(wheelsElement, {
  items: wheelItems.elements,
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
  for (const revealWheel of reveals.values()) {
    revealWheel();
  }
};

defineExpose({ focus, reveal });
</script>
