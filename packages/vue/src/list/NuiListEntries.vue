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
    :current="entry.current"
    :badge="entry.badge"
    :shortcut="entry.shortcut"
    v-on="entry.onClick ? { click: entry.onClick } : {}"
  >
    <template v-if="$slots.item" #default="{ selected, active }">
      <slot name="item" :item="entry" :selected="selected" :active="active" />
    </template>
  </NuiListItem>
</template>

<script setup lang="ts" generic="E extends NuiListEntry<unknown>">
import type { Component } from 'vue';
import { optionElementId, type NuiListEntry } from '../shared/options';
import NuiListItem from './NuiListItem.vue';

const { entries, listId, linkAs, indexOf } = defineProps<{
  entries: readonly E[];
  listId: string;
  linkAs?: string | Component | undefined;
  indexOf: (entry: E) => number;
}>();

const idFor = (entry: E): string => optionElementId(listId, indexOf(entry));
</script>
