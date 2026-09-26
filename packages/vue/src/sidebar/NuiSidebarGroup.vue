<template>
  <div class="nui-sidebar-group">
    <div v-if="label" :id="labelId" class="nui-sidebar-group__label">{{ label }}</div>
    <NuiList variant="nav" :labelled-by="label ? labelId : undefined">
      <NuiSidebarItem
        v-for="(entry, index) in items"
        :key="entry.key ?? index"
        :label="entry.label"
        :icon="entry.icon"
        :href="entry.href"
        :to="entry.to"
        :current="entry.current"
        :badge="entry.badge"
        :disabled="entry.disabled"
        v-on="entry.onClick ? { click: entry.onClick } : {}"
      />
      <slot />
    </NuiList>
  </div>
</template>

<script setup lang="ts">
import { useControlId } from '@numior/primitives';
import NuiList from '../list/NuiList.vue';
import NuiSidebarItem from './NuiSidebarItem.vue';
import type { NuiSidebarGroupProps } from './sidebar.types';

const { label, items = [] } = defineProps<NuiSidebarGroupProps>();

defineSlots<{ default(): unknown }>();

const labelId = useControlId();
</script>
