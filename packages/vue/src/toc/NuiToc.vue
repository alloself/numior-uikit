<template>
  <nav class="nui-toc" :aria-label="labelText">
    <p v-if="titleText !== ''" class="nui-toc__title">{{ titleText }}</p>
    <NuiTocEntries :items="items" :active-id="activeId" :depth="0" @select="onSelect" />
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages, useScrollSpy } from '@numior/primitives';
import NuiTocEntries from './NuiTocEntries.vue';
import { tocMessages } from './toc.messages';
import type { NuiTocItem, NuiTocProps } from './toc.types';

const { items, title, label, root, rootMargin } = defineProps<NuiTocProps>();

const emit = defineEmits<{ select: [id: string] }>();

const messages = useMessages(tocMessages);
const titleText = computed(() => title ?? messages.value.title);
const labelText = computed(() => label ?? messages.value.title);

const idsOf = (entries: readonly NuiTocItem[]): string[] =>
  entries.flatMap((entry) => [entry.id, ...idsOf(entry.children ?? [])]);

const ids = computed(() => idsOf(items));

const activeId = useScrollSpy(ids, { root: () => root, rootMargin: () => rootMargin });

const onSelect = (id: string): void => {
  emit('select', id);
};
</script>
