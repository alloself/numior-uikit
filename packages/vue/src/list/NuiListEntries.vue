<template>
  <NuiListItem
    v-for="(entry, position) in entries"
    :id="idFor(entry)"
    :key="entry.key ?? position"
    :value="entry.value"
    :label="entry.label"
    :description="entry.description"
    :icon="entry.icon"
    :href="entry.href"
    :to="entry.to"
    :as="linkAs"
    :disabled="entry.disabled"
    v-on="entry.onClick ? { click: entry.onClick } : {}"
  >
    <template v-if="$slots.item" #default>
      <slot name="item" :item="entry" :selected="isSelected(entry)" :active="isActive(entry)" />
    </template>
  </NuiListItem>
</template>

<script setup lang="ts" generic="E extends NuiListEntry<unknown>">
import type { Component } from 'vue';
import { optionElementId, type NuiListEntry } from '../shared/options';
import NuiListItem from './NuiListItem.vue';
import { useList } from './list-context';

const { entries, listId, linkAs, indexOf } = defineProps<{
  entries: readonly E[];
  listId: string;
  linkAs: string | Component;
  indexOf: (entry: E) => number;
}>();
const list = useList();

const idFor = (entry: E): string => optionElementId(listId, indexOf(entry));
const isSelected = (entry: E): boolean =>
  entry.value !== undefined && (list?.isSelected(entry.value) ?? false);
const isActive = (entry: E): boolean =>
  list?.activeId.value !== undefined && list.activeId.value === idFor(entry);
</script>
