<template>
  <template v-for="(entry, index) in items" :key="entry.key ?? index">
    <NuiMenuSeparator v-if="entry.type === NuiMenuEntryType.Separator" />
    <NuiMenuLabel v-else-if="entry.type === NuiMenuEntryType.Label">{{ entry.label }}</NuiMenuLabel>
    <NuiMenuSub
      v-else-if="entry.type === NuiMenuEntryType.Sub"
      :label="entry.label"
      :icon="entry.icon"
      :disabled="entry.disabled"
    >
      <NuiMenuEntries :items="entry.items" />
    </NuiMenuSub>
    <NuiMenuCheckboxItem
      v-else-if="entry.type === NuiMenuEntryType.Checkbox"
      :checked="entry.checked"
      :icon="entry.icon"
      :disabled="entry.disabled"
      :close-on-select="entry.closeOnSelect"
      @update:checked="entry.onCheckedChange"
    >
      {{ entry.label }}
    </NuiMenuCheckboxItem>
    <NuiMenuRadioEntries v-else-if="entry.type === NuiMenuEntryType.RadioGroup" :entry="entry" />
    <NuiMenuItem
      v-else
      :icon="entry.icon"
      :shortcut="entry.shortcut"
      :disabled="entry.disabled"
      :tone="entry.tone"
      :href="entry.href"
      :to="entry.to"
      :as="entry.as"
      :close-on-select="entry.closeOnSelect"
      @select="entry.onSelect?.()"
    >
      {{ entry.label }}
    </NuiMenuItem>
  </template>
</template>

<script setup lang="ts">
import NuiMenuCheckboxItem from './NuiMenuCheckboxItem.vue';
import NuiMenuItem from './NuiMenuItem.vue';
import NuiMenuLabel from './NuiMenuLabel.vue';
import NuiMenuRadioEntries from './NuiMenuRadioEntries.vue';
import NuiMenuSeparator from './NuiMenuSeparator.vue';
import NuiMenuSub from './NuiMenuSub.vue';
import { NuiMenuEntryType, type NuiMenuEntry } from './menu.types';

const { items } = defineProps<{ items: readonly NuiMenuEntry[] }>();
</script>
