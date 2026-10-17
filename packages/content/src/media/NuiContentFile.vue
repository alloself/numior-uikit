<template>
  <a :class="classes" :href="url" :download="name" :type="type === '' ? undefined : type">
    <span class="nui-content__file-icon" aria-hidden="true" />
    <span class="nui-content__file-name">{{ name }}</span>
    <span v-if="size !== undefined" class="nui-content__file-size">{{ size }}</span>
  </a>
</template>

<script setup lang="ts">
import { formatFileSize, useLocale } from '@numior/primitives';
import { computed } from 'vue';
import { fileKindOf } from '../content/content-schema';
import type { NuiContentViewProps } from '../content/content.types';

const { node } = defineProps<NuiContentViewProps>();

const locale = useLocale();

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const url = computed(() => textOf(node.attrs.url));
const name = computed(() => textOf(node.attrs.name));
const type = computed(() => textOf(node.attrs.type));

const size = computed(() =>
  typeof node.attrs.size === 'number' ? formatFileSize(node.attrs.size, locale.value) : undefined,
);

const classes = computed(() => [
  'nui-content__file',
  `nui-content__file--kind-${fileKindOf(type.value, name.value)}`,
]);
</script>
