<template>
  <NuiDrawer
    v-if="layout.mobile.value"
    :id="layout.sidebarId.value"
    v-model:open="layout.mobileOpen.value"
    :side="side"
    size="sm"
    :title="title ?? labelText"
    :close-label="closeLabel"
    class="nui-sidebar-drawer"
  >
    <div
      ref="root"
      class="nui-sidebar nui-sidebar--mobile"
      :class="[`nui-sidebar--side-${side}`, `nui-sidebar--variant-${variant}`]"
    >
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
      `nui-sidebar--variant-${variant}`,
      `nui-sidebar--collapsible-${collapsible}`,
      { 'nui-sidebar--collapsed': collapsed, 'nui-sidebar--rail': rail },
    ]"
    :aria-label="labelText"
    :inert="hidden || undefined"
  >
    <slot />
  </aside>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useDirection, useMessages } from '@numior/primitives';
import NuiDrawer from '../drawer/NuiDrawer.vue';
import { useLayout } from '../layout/layout-context';
import { provideSidebar } from './sidebar-context';
import { sidebarMessages } from './sidebar.messages';
import {
  NuiSidebarCollapsible,
  NuiSidebarSide,
  NuiSidebarVariant,
  type NuiSidebarProps,
} from './sidebar.types';

const {
  collapsible = NuiSidebarCollapsible.Offcanvas,
  side = NuiSidebarSide.Start,
  variant = NuiSidebarVariant.Panel,
  label,
  title,
  closeLabel,
} = defineProps<NuiSidebarProps>();

defineSlots<{ default(): unknown }>();

const layout = useLayout();
const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);
const messages = useMessages(sidebarMessages);

const labelText = computed(() => label ?? messages.value.label);
const collapsed = computed(() => !layout.open.value && collapsible !== NuiSidebarCollapsible.None);
const rail = computed(() => collapsed.value && collapsible === NuiSidebarCollapsible.Icon);
const hidden = computed(() => collapsed.value && collapsible === NuiSidebarCollapsible.Offcanvas);

provideSidebar({
  rail,
  mobile: layout.mobile,
  tooltipPlacement: () =>
    (side === NuiSidebarSide.Start) === !direction.isRtl() ? 'right' : 'left',
  expand: () => {
    layout.open.value = true;
  },
  closeMobile: () => {
    layout.mobileOpen.value = false;
  },
});
</script>
