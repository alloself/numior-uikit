<template>
  <NuiList
    :ref="setList"
    class="nui-editor-suggest"
    variant="floating"
    size="sm"
    selectable="single"
    :items="entries"
    :keyboard="false"
    :active-id="activeId"
    :label="label"
    :loading="loading && entries.length === 0"
    :loading-label="loadingLabel"
    :empty-label="emptyLabel"
    v-bind="{ ...contentAttrs, id }"
    @select="choose"
    @pointermove="hover"
    @pointerdown.prevent
  >
    <template v-if="$slots.leading" #leading="{ item }">
      <slot name="leading" :item="item" />
    </template>
  </NuiList>
</template>

<script setup lang="ts">
import { useFloating, usePopover } from '@numior/primitives';
import { NuiList, optionElementId, optionIndexOf, type NuiListEntry } from '@numior/vue';
import { computed, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue';
import type { NuiEditorSuggestMenuProps } from './suggest.types';

const {
  id,
  entries,
  active,
  anchor,
  open,
  label,
  loading = false,
  loadingLabel,
  emptyLabel,
} = defineProps<NuiEditorSuggestMenuProps>();

const emit = defineEmits<{
  select: [key: string];
  hover: [index: number];
}>();

defineSlots<{ leading?(props: { item: NuiListEntry<string> }): unknown }>();

const list = shallowRef<HTMLElement | null>(null);
const shown = ref(open);

const activeId = computed(() => optionElementId(id, active));

const setList = (instance: Element | ComponentPublicInstance | null): void => {
  const element: unknown = instance instanceof Element ? instance : instance?.$el;

  list.value = element instanceof HTMLElement ? element : null;
};

const { contentAttrs } = usePopover(list, { open: shown, mode: 'manual', id: () => id });

useFloating(() => anchor, list, { placement: 'bottom-start', offset: 6, enabled: shown });

const choose = (entry: NuiListEntry<string>): void => {
  if (entry.value === undefined) {
    return;
  }

  emit('select', entry.value);
};

const hover = (event: PointerEvent): void => {
  const option = event.target instanceof Element ? event.target.closest('[role="option"]') : null;

  if (option === null) {
    return;
  }

  emit('hover', optionIndexOf(option));
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
