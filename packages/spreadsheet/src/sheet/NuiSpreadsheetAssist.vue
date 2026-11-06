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
  />
  <div ref="hintPanel" class="nui-spreadsheet__hint" role="tooltip" v-bind="hintAttrs">
    <span
      v-for="(part, index) in hint"
      :key="index"
      :class="{ 'nui-spreadsheet__hint-part--current': part.current }"
      >{{ part.text }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { useFloating, usePopover } from '@numior/primitives';
import { NuiList, optionElementId, optionIndexOf, type NuiListEntry } from '@numior/vue';
import {
  computed,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import type { SheetAssistProps } from './sheet.types';

const { listId, hintId, entries, active, anchor, open, hint, label } =
  defineProps<SheetAssistProps>();

const emit = defineEmits<{
  choose: [key: string];
  hover: [index: number];
}>();

const list = shallowRef<HTMLElement | null>(null);
const hintPanel = useTemplateRef<HTMLElement>('hintPanel');

const listShown = ref(open);
const hintShown = ref(hint.length > 0);

const activeId = computed(() => optionElementId(listId, active));

const setList = (instance: Element | ComponentPublicInstance | null): void => {
  const element: unknown = instance instanceof Element ? instance : instance?.$el;

  list.value = element instanceof HTMLElement ? element : null;
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

useFloating(() => anchor, hintPanel, { placement: 'bottom-start', offset: 4, enabled: hintShown });

const choose = (entry: NuiListEntry): void => {
  if (entry.value !== undefined) {
    emit('choose', entry.value);
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
