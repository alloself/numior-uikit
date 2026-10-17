<template>
  <span class="nui-content__file-icon" aria-hidden="true" />
  <span class="nui-content__file-name">{{ name }}</span>
  <span v-if="size !== undefined" class="nui-content__file-size">{{ size }}</span>
</template>

<script setup lang="ts">
import { formatFileSize, useLocale } from '@numior/primitives';
import { useEventListener } from '@vueuse/core';
import { computed } from 'vue';
import type { NuiEditorBlockViewProps } from '../block.types';

const { node, element, editable } = defineProps<NuiEditorBlockViewProps>();

const locale = useLocale();

const name = computed(() => (typeof node.attrs.name === 'string' ? node.attrs.name : ''));

const size = computed(() =>
  typeof node.attrs.size === 'number' ? formatFileSize(node.attrs.size, locale.value) : undefined,
);

useEventListener(
  () => element,
  'click',
  (event: MouseEvent) => {
    if (editable && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  },
);
</script>
