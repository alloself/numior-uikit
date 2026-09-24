<template>
  <NuiListItem
    v-for="(entry, index) in items"
    :key="entry.key ?? index"
    :value="entry.value"
    :title="entry.title"
    :description="entry.description"
    :icon="entry.icon"
    :href="entry.href"
    :to="entry.to"
    :as="linkAs"
    :disabled="entry.disabled"
    v-on="entry.onClick ? { click: entry.onClick } : {}"
  >
    <template v-if="$slots.item" #default>
      <slot name="item" :item="entry" :selected="isSelected(entry)" />
    </template>
  </NuiListItem>
</template>

<script setup lang="ts" generic="T">
import type { Component } from 'vue';
import NuiListItem from './NuiListItem.vue';
import { useList } from './list-context';
import type { NuiListEntry } from './list.types';

const { items, linkAs } = defineProps<{
  items: readonly NuiListEntry<T>[];
  linkAs: string | Component;
}>();
const list = useList();
const isSelected = (entry: NuiListEntry<T>): boolean =>
  entry.value !== undefined && (list?.isSelected(entry.value) ?? false);
</script>
