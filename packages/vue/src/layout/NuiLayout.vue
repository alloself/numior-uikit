<template>
  <div
    class="nui-layout"
    :class="{ 'nui-layout--mobile': mobile, 'nui-layout--sidebar-open': open }"
    :style="{ '--_sidebar-size': sidebarWidth, '--_rail-size': railWidth }"
  >
    <slot name="sidebar" />
    <div class="nui-layout__body">
      <slot name="header" />
      <component :is="contentAs" class="nui-layout__content"><slot /></component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useControlId, useHotkey, useMediaQuery } from '@numior/primitives';
import { provideLayout } from './layout-context';
import type { NuiLayoutProps } from './layout.types';

const {
  id,
  sidebarWidth = '16rem',
  railWidth = '3.5rem',
  mobileQuery = '(max-width: 48rem)',
  shortcut = true,
  contentAs = 'main',
} = defineProps<NuiLayoutProps>();

const open = defineModel<boolean>('open', { default: true });
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false });

const mobile = useMediaQuery(() => mobileQuery);
const sidebarId = useControlId(() => (id === undefined ? undefined : `${id}-sidebar`));

const toggle = (): void => {
  if (mobile.value) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    open.value = !open.value;
  }
};

watch(mobile, (isMobile) => {
  if (!isMobile) {
    mobileOpen.value = false;
  }
});

provideLayout({ open, mobileOpen, mobile, sidebarId, toggle });
useHotkey('mod+b', toggle, { enabled: () => shortcut });
</script>
