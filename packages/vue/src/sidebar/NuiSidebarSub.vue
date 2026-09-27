<template>
  <NuiListItem
    ref="item"
    class="nui-sidebar-sub"
    :class="{ 'nui-sidebar-sub--open': expanded, 'nui-sidebar-sub--active': active }"
    :label="label"
    :icon="icon"
    interactive
    :aria-expanded="expanded ? 'true' : 'false'"
    :aria-controls="listId"
    @click="toggle"
  >
    <template #trailing>
      <NuiIcon alias="chevron-down" class="nui-sidebar-sub__chevron" />
    </template>
    <template #nested>
      <NuiTooltip
        :anchor="action"
        :disabled="!sidebar.rail.value"
        :placement="sidebar.tooltipPlacement()"
      >
        {{ label }}
      </NuiTooltip>
      <div class="nui-sidebar-sub__panel">
        <NuiList
          :id="listId"
          variant="nav"
          class="nui-sidebar-sub__list"
          :inert="expanded ? undefined : true"
        >
          <slot />
        </NuiList>
      </div>
    </template>
  </NuiListItem>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useControlId } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import NuiListItem from '../list/NuiListItem.vue';
import NuiTooltip from '../tooltip/NuiTooltip.vue';
import { provideSidebarSub, useSidebar } from './sidebar-context';
import type { NuiSidebarSubProps } from './sidebar.types';

const { label, icon, active = false, id } = defineProps<NuiSidebarSubProps>();
const open = defineModel<boolean>('open', { default: false });

defineSlots<{ default(): unknown }>();

const sidebar = useSidebar();
const item = useTemplateRef<InstanceType<typeof NuiListItem>>('item');
const action = computed(() => item.value?.action ?? null);
const listId = useControlId(() => (id === undefined ? undefined : `${id}-items`));
const expanded = computed(() => open.value && !sidebar.rail.value);

const toggle = (): void => {
  if (sidebar.rail.value) {
    sidebar.expand();
    open.value = true;
  } else {
    open.value = !open.value;
  }
};

provideSidebarSub({
  reveal: () => {
    open.value = true;
  },
});
</script>
