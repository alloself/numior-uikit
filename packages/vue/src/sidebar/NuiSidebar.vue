<template>
  <NuiDrawer
    v-if="layout.mobile.value"
    :id="layout.sidebarId.value"
    v-model:open="layout.mobileOpen.value"
    :side="side"
    size="sm"
    :title="title ?? label"
    :close-label="closeLabel"
    class="nui-sidebar-drawer"
  >
    <div ref="root" class="nui-sidebar nui-sidebar--mobile" :class="`nui-sidebar--side-${side}`">
      <slot />
    </div>
  </NuiDrawer>
  <aside
    v-else
    :id="layout.sidebarId.value"
    ref="root"
    class="nui-sidebar"
    :class="[
      `nui-sidebar--side-${side}`,
      `nui-sidebar--collapsible-${collapsible}`,
      { 'nui-sidebar--collapsed': collapsed, 'nui-sidebar--rail': rail },
    ]"
    :aria-label="label"
    :inert="hidden || undefined"
  >
    <slot />
  </aside>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useDirection } from '@numior/primitives';
import NuiDrawer from '../drawer/NuiDrawer.vue';
import { useLayout } from '../layout/layout-context';
import { provideSidebar } from './sidebar-context';
import type { NuiSidebarProps } from './sidebar.types';

const {
  collapsible = 'offcanvas',
  side = 'start',
  label = 'Navigation',
  title,
  closeLabel = 'Close',
} = defineProps<NuiSidebarProps>();

defineSlots<{ default(): unknown }>();

const layout = useLayout();
const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);

const collapsed = computed(() => !layout.open.value && collapsible !== 'none');
const rail = computed(() => collapsed.value && collapsible === 'icon');
const hidden = computed(() => collapsed.value && collapsible === 'offcanvas');

provideSidebar({
  rail,
  mobile: layout.mobile,
  tooltipPlacement: () => ((side === 'start') === !direction.isRtl() ? 'right' : 'left'),
  expand: () => {
    layout.open.value = true;
  },
  closeMobile: () => {
    layout.mobileOpen.value = false;
  },
});
</script>
