<template>
  <li
    class="nui-sidebar-sub"
    :class="{ 'nui-sidebar-sub--open': expanded, 'nui-sidebar-sub--active': active }"
  >
    <NuiTooltip :disabled="!sidebar.rail.value" :placement="sidebar.tooltipPlacement()">
      <template #trigger="{ attrs }">
        <button
          type="button"
          class="nui-sidebar-item__action nui-sidebar-sub__toggle"
          :aria-expanded="expanded ? 'true' : 'false'"
          :aria-controls="listId"
          v-bind="attrs"
          @click="toggle"
        >
          <NuiRow :icon="icon" :title="label" inline nowrap>
            <template #trailing>
              <NuiIcon alias="chevron-down" class="nui-sidebar-sub__chevron" />
            </template>
          </NuiRow>
        </button>
      </template>
      {{ label }}
    </NuiTooltip>
    <div class="nui-sidebar-sub__panel">
      <ul :id="listId" class="nui-sidebar-sub__items" :inert="expanded ? undefined : true">
        <slot />
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useControlId } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiRow from '../row/NuiRow.vue';
import NuiTooltip from '../tooltip/NuiTooltip.vue';
import { useSidebar } from './sidebar-context';
import type { NuiSidebarSubProps } from './sidebar.types';

const { label, icon, active = false, id } = defineProps<NuiSidebarSubProps>();
const open = defineModel<boolean>('open', { default: false });

defineSlots<{ default(): unknown }>();

const sidebar = useSidebar();
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
</script>
