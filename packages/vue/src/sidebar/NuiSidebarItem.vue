<template>
  <li
    class="nui-sidebar-item"
    :class="{ 'nui-sidebar-item--active': active, 'nui-sidebar-item--disabled': disabled }"
  >
    <NuiTooltip :disabled="!sidebar.rail.value" :placement="sidebar.tooltipPlacement()">
      <template #trigger="{ attrs }">
        <component
          :is="isLink ? NuiLink : 'button'"
          class="nui-sidebar-item__action"
          v-bind="{ ...attrs, ...actionAttrs }"
          @click="onClick"
        >
          <NuiRow :icon="icon" :title="label" inline nowrap>
            <template v-if="$slots.default" #default><slot /></template>
            <template v-if="badge !== undefined || $slots.trailing" #trailing>
              <slot name="trailing">
                <span class="nui-sidebar-item__badge">{{ badge }}</span>
              </slot>
            </template>
          </NuiRow>
        </component>
      </template>
      {{ tooltip ?? label }}
    </NuiTooltip>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AttrRecord } from '@numior/primitives';
import NuiLink from '../link/NuiLink.vue';
import NuiRow from '../row/NuiRow.vue';
import NuiTooltip from '../tooltip/NuiTooltip.vue';
import { useSidebar } from './sidebar-context';
import type { NuiSidebarItemProps } from './sidebar.types';

const {
  label,
  icon,
  href,
  to,
  as = 'a',
  active = false,
  disabled = false,
  badge,
  tooltip,
} = defineProps<NuiSidebarItemProps>();

defineSlots<{ default(): unknown; trailing(): unknown }>();

const sidebar = useSidebar();
const isLink = computed(() => href !== undefined || to !== undefined);

const actionAttrs = computed<AttrRecord>(() => {
  const current = active ? { 'aria-current': 'page' } : {};

  if (isLink.value) {
    return { ...current, as, href, to, tone: 'neutral', underline: 'none', disabled };
  }

  return { ...current, type: 'button', disabled: disabled || undefined };
});

const onClick = (): void => {
  if (sidebar.mobile.value && !disabled) {
    sidebar.closeMobile();
  }
};
</script>
