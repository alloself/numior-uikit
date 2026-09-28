<template>
  <NuiListItem
    ref="item"
    :label="label"
    :icon="icon"
    :href="href"
    :to="to"
    :as="as"
    :current="current"
    :badge="badge"
    :disabled="disabled"
    @click="onClick"
  >
    <template v-if="$slots.default" #default><slot /></template>
    <template v-if="$slots.trailing" #trailing><slot name="trailing" /></template>
    <template #nested>
      <NuiTooltip
        :anchor="action"
        :disabled="!sidebar.rail.value"
        :placement="sidebar.tooltipPlacement()"
      >
        {{ tooltip ?? label }}
      </NuiTooltip>
    </template>
  </NuiListItem>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import NuiListItem from '../list/NuiListItem.vue';
import NuiTooltip from '../tooltip/NuiTooltip.vue';
import { useSidebar, useSidebarSub } from './sidebar-context';
import type { NuiSidebarItemProps } from './sidebar.types';

const {
  label,
  icon,
  href,
  to,
  as,
  current = false,
  disabled = false,
  badge,
  tooltip,
} = defineProps<NuiSidebarItemProps>();

defineSlots<{ default(): unknown; trailing(): unknown }>();

const sidebar = useSidebar();
const sub = useSidebarSub();
const item = useTemplateRef<InstanceType<typeof NuiListItem>>('item');
const action = computed(() => item.value?.action ?? null);

watch(
  () => current,
  (isCurrent) => {
    if (isCurrent) {
      sub?.reveal();
    }
  },
  { immediate: true },
);

const onClick = (): void => {
  if (sidebar.mobile.value && !disabled) {
    sidebar.closeMobile();
  }
};
</script>
