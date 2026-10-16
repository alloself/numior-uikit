<template>
  <NuiList
    :ref="setList"
    class="nui-editor-slash"
    variant="floating"
    size="sm"
    selectable="single"
    :items="entries"
    :keyboard="false"
    :active-id="activeId"
    :label="texts.blocks"
    v-bind="{ ...contentAttrs, id }"
    @select="choose"
    @pointermove="hover"
    @pointerdown.prevent
  />
</template>

<script setup lang="ts">
import { useFloating, useMessages, usePopover } from '@numior/primitives';
import { NuiList, optionElementId, optionIndexOf, type NuiListEntry } from '@numior/vue';
import { computed, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { SlashItem } from './slash-items';
import type { NuiEditorSlashMenuProps } from './slash.types';

const { id, items, active, anchor, open } = defineProps<NuiEditorSlashMenuProps>();

const emit = defineEmits<{
  choose: [item: SlashItem];
  hover: [index: number];
}>();

const list = shallowRef<HTMLElement | null>(null);
const texts = useMessages(editorMessages);
const shown = ref(open);

const entries = computed((): NuiListEntry<string>[] =>
  items.map((item) => ({ value: item.key, label: item.label, icon: item.icon })),
);

const activeId = computed(() => optionElementId(id, active));

const setList = (instance: Element | ComponentPublicInstance | null): void => {
  const element: unknown = instance instanceof Element ? instance : instance?.$el;

  list.value = element instanceof HTMLElement ? element : null;
};

const { contentAttrs } = usePopover(list, { open: shown, mode: 'manual', id: () => id });

useFloating(() => anchor, list, { placement: 'bottom-start', offset: 6, enabled: shown });

const choose = (entry: NuiListEntry<string>): void => {
  const item = items.find((candidate) => candidate.key === entry.value);

  if (item !== undefined) {
    emit('choose', item);
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
    shown.value = value;
  },
);

watch(
  activeId,
  (value) => {
    list.value?.ownerDocument.getElementById(value)?.scrollIntoView({ block: 'nearest' });
  },
  { flush: 'post' },
);
</script>
