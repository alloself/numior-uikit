<template>
  <div
    class="nui-sidebar-group"
    :class="{ 'nui-sidebar-group--collapsible': collapsible, 'nui-sidebar-group--closed': closed }"
  >
    <button
      v-if="label && collapsible"
      :id="labelId"
      type="button"
      class="nui-sidebar-group__label nui-sidebar-group__toggle"
      :aria-expanded="closed ? 'false' : 'true'"
      :aria-controls="listId"
      @click="open = !open"
    >
      <span class="nui-sidebar-group__text">{{ label }}</span>
      <NuiIcon alias="chevron-down" class="nui-sidebar-group__chevron" />
    </button>
    <div v-else-if="label" :id="labelId" class="nui-sidebar-group__label">{{ label }}</div>
    <div class="nui-sidebar-group__panel">
      <NuiList
        :id="listId"
        variant="nav"
        class="nui-sidebar-group__list"
        :labelled-by="label ? labelId : undefined"
        :inert="closed ? true : undefined"
      >
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useControlId } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import NuiSidebarItem from './NuiSidebarItem.vue';
import { useSidebar } from './sidebar-context';
import type { NuiSidebarGroupProps } from './sidebar.types';

const { id, label, items = [], collapsible = false } = defineProps<NuiSidebarGroupProps>();

const open = defineModel<boolean>('open', { default: true });

defineSlots<{ default?(): unknown }>();

const sidebar = useSidebar();
const labelId = useControlId(() => id);
const listId = computed(() => `${labelId.value}-list`);
const closed = computed(() => collapsible && !open.value && !sidebar.rail.value);
</script>
