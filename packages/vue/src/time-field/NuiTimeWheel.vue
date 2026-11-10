<template>
  <div
    ref="wheel"
    class="nui-time-field__wheel"
    role="spinbutton"
    :tabindex="tabStop ? 0 : -1"
    :aria-label="label"
    :aria-valuenow="current?.value"
    :aria-valuetext="current?.text"
    :aria-valuemin="options[0]?.value"
    :aria-valuemax="options.at(-1)?.value"
    @keydown="onKeydown"
    @scroll="onScroll"
    @scrollend="settle"
    @pointerdown="drag.onPointerdown"
  >
    <div
      v-for="(option, index) in options"
      :key="option.value"
      class="nui-time-field__wheel-item"
      :class="{
        'nui-time-field__wheel-item--selected': index === selected,
        'nui-time-field__wheel-item--disabled': option.disabled,
      }"
      aria-hidden="true"
      @click="onItemClick(index)"
    >
      {{ option.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import type { NuiTimeWheelProps } from './time-field.types';
import { nearestEnabled, wheelTarget, type WheelOption } from './time-wheels';
import { useWheelDrag } from './use-wheel-drag';

const SETTLE_DELAY = 150;

const { options, selected, label, tabStop } = defineProps<NuiTimeWheelProps>();

const emit = defineEmits<{ select: [index: number] }>();

const wheel = useTemplateRef<HTMLDivElement>('wheel');
const timer: { id: ReturnType<typeof setTimeout> | undefined } = { id: undefined };

const current = computed<WheelOption | undefined>(() => options[selected]);

const rowHeight = (): number => {
  const item = wheel.value?.firstElementChild;
  return item instanceof HTMLElement ? item.offsetHeight : 0;
};

const indexAt = (top: number): number => {
  const row = rowHeight();
  return row > 0 ? Math.min(options.length - 1, Math.max(0, Math.round(top / row))) : selected;
};

const scrollToIndex = (index: number, instant: boolean): void => {
  const element = wheel.value;
  const top = index * rowHeight();

  if (element && instant && typeof element.scrollTo === 'function') {
    element.scrollTo({ top, behavior: 'instant' });
  } else if (element) {
    element.scrollTop = top;
  }
};

const springBack = (): void => {
  const element = wheel.value;

  if (element) {
    scrollToIndex(nearestEnabled(options, indexAt(element.scrollTop)), false);
  }
};

const drag = useWheelDrag({ element: () => wheel.value, release: springBack });

const stopTimer = (): void => {
  clearTimeout(timer.id);
  timer.id = undefined;
};

const choose = (index: number): void => {
  if (options[index]?.disabled === false) {
    emit('select', index);
  }
};

const settle = (): void => {
  stopTimer();

  const element = wheel.value;

  if (!element || drag.holding() || options.length === 0) {
    return;
  }

  const index = indexAt(element.scrollTop);
  const target = nearestEnabled(options, index);

  if (target !== index) {
    scrollToIndex(target, false);
  } else if (index !== selected) {
    choose(index);
  }
};

const onScroll = (): void => {
  stopTimer();
  timer.id = setTimeout(settle, SETTLE_DELAY);
};

const onKeydown = (event: KeyboardEvent): void => {
  const target = wheelTarget(event.key, options, selected);

  if (target === null) {
    return;
  }

  event.preventDefault();
  choose(target);
};

const onItemClick = (index: number): void => {
  if (!drag.swallowClick()) {
    choose(index);
  }
};

watch(
  () => selected,
  (index) => {
    if (!drag.holding()) {
      scrollToIndex(index, false);
    }
  },
  { flush: 'post' },
);

onMounted(() => {
  scrollToIndex(selected, true);
});

onBeforeUnmount(stopTimer);

defineExpose({ reveal: () => scrollToIndex(selected, true) });
</script>
