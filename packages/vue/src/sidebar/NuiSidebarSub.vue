<template>
  <NuiListItem
    ref="item"
    class="nui-sidebar-sub"
    :class="{
      'nui-sidebar-sub--open': expanded,
      'nui-sidebar-sub--active': active,
      'nui-sidebar-sub--flyout-open': flyout.open.value,
    }"
    :label="label"
    :icon="icon"
    interactive
    :aria-expanded="controlsFlyout ? (flyout.open.value ? 'true' : 'false') : expandedAttr"
    :aria-controls="controlsFlyout ? flyout.id.value : listId"
    v-bind="controlsFlyout ? flyout.triggerHandlers : {}"
    @click="toggle"
  >
    <template #trailing>
      <NuiIcon icon="chevron-down" class="nui-sidebar-sub__chevron" />
    </template>
    <template #nested>
      <NuiTooltip
        :anchor="action"
        :disabled="!controlsFlyout || flyout.open.value"
        :placement="sidebar.tooltipPlacement()"
      >
        {{ label }}
      </NuiTooltip>
      <div
        v-if="controlsFlyout"
        ref="flyout-node"
        class="nui-sidebar-sub__flyout nui-layer"
        role="group"
        :aria-labelledby="titleId"
        v-bind="{ ...flyout.contentAttrs.value, ...flyout.contentHandlers }"
      >
        <span :id="titleId" class="nui-sidebar-sub__title">{{ label }}</span>
        <NuiList variant="nav" class="nui-sidebar-sub__flyout-list">
          <slot />
        </NuiList>
      </div>
      <div v-else class="nui-sidebar-sub__panel">
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
import { provideSidebar, provideSidebarSub, useSidebar } from './sidebar-context';
import { useSidebarFlyout } from './use-sidebar-flyout';
import type { NuiSidebarSubProps } from './sidebar.types';

const { label, icon, active = false, id } = defineProps<NuiSidebarSubProps>();
const open = defineModel<boolean>('open', { default: false });

defineSlots<{ default(): unknown }>();

const sidebar = useSidebar();
const item = useTemplateRef<InstanceType<typeof NuiListItem>>('item');
const flyoutElement = useTemplateRef<HTMLElement>('flyout-node');
const action = computed(() => item.value?.action ?? null);
const listId = useControlId(() => (id === undefined ? undefined : `${id}-items`));
const titleId = computed(() => `${listId.value}-title`);
const expanded = computed(() => open.value && !sidebar.rail.value);
const expandedAttr = computed(() => (expanded.value ? 'true' : 'false'));
const controlsFlyout = computed(() => sidebar.rail.value);

const flyout = useSidebarFlyout({
  enabled: sidebar.rail,
  id: () => (id === undefined ? undefined : `${id}-flyout`),
  trigger: action,
  content: flyoutElement,
});

const toggle = (): void => {
  if (sidebar.rail.value) {
    flyout.toggle();
  } else {
    open.value = !open.value;
  }
};

provideSidebar({ ...sidebar, rail: computed(() => false) });

provideSidebarSub({
  reveal: () => {
    open.value = true;
  },
  dismiss: () => flyout.dismiss(),
});
</script>
