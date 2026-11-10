<template>
  <template v-if="editable">
    <div
      v-for="(gap, index) in gaps"
      :key="gap.key"
      ref="separators"
      class="nui-editor-columns__separator"
      :class="{ 'nui-editor-columns__separator--active': active === index }"
      role="separator"
      aria-orientation="vertical"
      aria-valuemin="15"
      aria-valuemax="85"
      :aria-valuenow="gap.value"
      :aria-label="texts.columnWidth({ index: index + 1 })"
      tabindex="0"
      @pointerdown="onPointerdown(index, $event)"
      @keydown="onKeydown(index, $event)"
    />
  </template>
</template>

<script setup lang="ts">
import { Direction, useMessages } from '@numior/primitives';
import { useResizeObserver } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../../editor/editor.messages';
import type { NuiEditorBlockViewProps } from '../block.types';
import { setShares, shareOf, splitShares } from './columns';
import { columnElements, measureSeparators, ratioAt } from './columns-layout';
import { ContentNodeKind } from '@numior/editor-core';

const { node, element, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const texts = useMessages(editorMessages);

const separators = useTemplateRef<HTMLElement[]>('separators');

const active = ref<number | undefined>();

const STEP = 0.05;

const columns = computed(() =>
  node.content.flatMap((child) => (child.kind === ContentNodeKind.Element ? [child] : [])),
);

const gaps = computed(() =>
  columns.value.slice(1).map((right, index) => {
    const left = shareOf(columns.value[index]);

    return { key: right.id, value: Math.round((100 * left) / (left + shareOf(right))) };
  }),
);

const rtl = (): boolean => getComputedStyle(element).direction === Direction.Rtl;

const measure = (): void => {
  measureSeparators(element, separators.value ?? [], rtl());
};

const pairAt = (index: number) => {
  const left = columns.value[index];
  const right = columns.value[index + 1];

  return left === undefined || right === undefined
    ? undefined
    : { left, right, total: shareOf(left) + shareOf(right) };
};

const commit = (index: number, ratio: number): void => {
  const pair = pairAt(index);

  if (pair === undefined) {
    return;
  }

  const [first, second] = splitShares(pair.total, ratio);

  editor.run(
    setShares([
      [pair.left.id, first],
      [pair.right.id, second],
    ]),
  );
};

const preview = (index: number, ratio: number): void => {
  const pair = pairAt(index);
  const [first, second] = columnElements(element).slice(index, index + 2);

  if (pair === undefined || first === undefined || second === undefined) {
    return;
  }

  const [left, right] = splitShares(pair.total, ratio);

  first.style.flexGrow = String(left);
  second.style.flexGrow = String(right);
  measure();
};

const onPointerdown = (index: number, event: PointerEvent): void => {
  const separator = separators.value?.[index];

  if (event.button !== 0 || separator === undefined) {
    return;
  }
  event.preventDefault();
  separator.setPointerCapture(event.pointerId);
  active.value = index;

  let ratio: number | undefined;

  const move = (next: PointerEvent): void => {
    ratio = ratioAt(element, index, next.clientX, rtl());
    if (ratio !== undefined) {
      preview(index, ratio);
    }
  };

  const end = (): void => {
    separator.removeEventListener('pointermove', move);
    separator.removeEventListener('pointerup', end);
    separator.removeEventListener('pointercancel', end);
    active.value = undefined;
    if (ratio !== undefined) {
      commit(index, ratio);
    }
  };

  separator.addEventListener('pointermove', move);
  separator.addEventListener('pointerup', end);
  separator.addEventListener('pointercancel', end);
};

const onKeydown = (index: number, event: KeyboardEvent): void => {
  const pair = pairAt(index);
  const forward = rtl() ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl() ? 'ArrowRight' : 'ArrowLeft';
  const step = event.key === forward ? STEP : event.key === backward ? -STEP : 0;

  if (pair === undefined || step === 0) {
    return;
  }
  event.preventDefault();
  commit(index, shareOf(pair.left) / pair.total + step);
};

useResizeObserver(
  () => element,
  () => {
    measure();
  },
);

watch(() => node, measure, { flush: 'post' });
</script>
