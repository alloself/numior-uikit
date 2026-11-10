<template>
  <NuiList
    :ref="setList"
    variant="floating"
    size="sm"
    selectable="single"
    :items="entries"
    :keyboard="false"
    :active-id="activeId"
    :label="label"
    v-bind="{ ...listAttrs, id: listId }"
    @select="choose"
    @pointermove="hover"
    @pointerdown.prevent
  >
    <template #item="{ item }">
      <span class="nui-spreadsheet__match">{{ item.label?.slice(0, typed) }}</span
      >{{ item.label?.slice(typed) }}
    </template>
  </NuiList>
  <NuiList
    :ref="setHint"
    variant="floating"
    size="sm"
    :items="hintItems"
    :label="hintLabel"
    v-bind="{ ...hintAttrs, id: hintId }"
    @pointerdown.prevent
  >
    <template #item>
      <span
        v-for="(part, index) in hint"
        :key="index"
        :class="[
          `nui-spreadsheet__hint-part--${part.kind}`,
          { 'nui-spreadsheet__hint-part--current': part.current },
        ]"
        >{{ part.text }}</span
      >
    </template>
  </NuiList>
</template>

<script setup lang="ts">
import { useFloating, usePopover } from '@numior/primitives';
import { NuiList, optionElementId, optionIndexOf, type NuiListEntry } from '@numior/vue';
import { computed, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue';
import type { SheetAssistProps } from './sheet.types';

const { listId, hintId, entries, active, anchor, open, hint, summary, typed, label, hintLabel } =
  defineProps<SheetAssistProps>();

const emit = defineEmits<{
  select: [key: string];
  hover: [index: number];
}>();

const list = shallowRef<HTMLElement | null>(null);

const hintPanel = shallowRef<HTMLElement | null>(null);

const listShown = ref(open);

const hintShown = ref(hint.length > 0);

const activeId = computed(() => optionElementId(listId, active));

const hintItems = computed((): NuiListEntry[] => [
  {
    key: 'signature',
    label: hint.map((part) => part.text).join(''),
    description: summary === '' ? undefined : summary,
  },
]);

const elementOf = (instance: Element | ComponentPublicInstance | null): HTMLElement | null => {
  const element: unknown = instance instanceof Element ? instance : instance?.$el;

  return element instanceof HTMLElement ? element : null;
};

const setList = (instance: Element | ComponentPublicInstance | null): void => {
  list.value = elementOf(instance);
};

const setHint = (instance: Element | ComponentPublicInstance | null): void => {
  hintPanel.value = elementOf(instance);
};

const { contentAttrs: listAttrs } = usePopover(list, {
  open: listShown,
  mode: 'manual',
  id: () => listId,
});

const { contentAttrs: hintAttrs } = usePopover(hintPanel, {
  open: hintShown,
  mode: 'manual',
  id: () => hintId,
});

useFloating(() => anchor, list, {
  placement: 'bottom-start',
  offset: 4,
  enabled: listShown,
  size: { fitHeight: true, maxBlockSize: 256, fitWidth: true, maxInlineSize: 384 },
});

useFloating(() => anchor, hintPanel, {
  placement: 'bottom-start',
  offset: 4,
  enabled: hintShown,
  size: { fitWidth: true, maxInlineSize: 384 },
});

const choose = (entry: NuiListEntry): void => {
  if (entry.value !== undefined) {
    emit('select', entry.value);
  }
};

const hover = (event: PointerEvent): void => {
  const option = event.target instanceof Element ? event.target.closest('[role="option"]') : null;

  if (option !== null) {
    emit('hover', optionIndexOf(option));
  }
};

watch(
  () => open,
  (value) => {
    listShown.value = value;
  },
);

watch(
  () => hint.length > 0,
  (value) => {
    hintShown.value = value;
  },
);

watch(
  activeId,
  (value) => {
    list.value?.ownerDocument.getElementById(value)?.scrollIntoView?.({ block: 'nearest' });
  },
  { flush: 'post' },
);
</script>
