<template>
  <div
    class="nui-layout"
    :class="[
      `nui-layout--header-${header}`,
      {
        'nui-layout--mobile': mobile,
        'nui-layout--sidebar-open': open,
        'nui-layout--sticky': sticky,
        'nui-layout--pending': !mounted,
        'nui-layout--with-end': $slots.end !== undefined,
      },
    ]"
    :style="{ '--_sidebar-size': sidebarWidth, '--_rail-size': railWidth, '--_end-size': endWidth }"
  >
    <slot v-if="header === 'full'" name="header" />
    <div class="nui-layout__row">
      <slot name="sidebar" />
      <div class="nui-layout__body">
        <slot v-if="header === 'inset'" name="header" />
        <component :is="contentAs" class="nui-layout__content"><slot /></component>
      </div>
      <div v-if="$slots.end" class="nui-layout__end">
        <slot name="end" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useControlId, useHotkey, useMediaQuery } from '@numior/primitives';
import { provideLayout } from './layout-context';
import type { NuiLayoutProps } from './layout.types';

const {
  id,
  header = 'inset',
  sidebarWidth = '16rem',
  railWidth = '3.5rem',
  endWidth = '14rem',
  mobileQuery = '(max-width: 48rem)',
  shortcut = true,
  sticky = false,
  contentAs = 'main',
} = defineProps<NuiLayoutProps>();

const open = defineModel<boolean>('open', { default: true });
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false });

defineSlots<{ sidebar?(): unknown; header?(): unknown; default?(): unknown; end?(): unknown }>();

const mobile = useMediaQuery(() => mobileQuery);
const mounted = ref(false);
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
useHotkey('mod+b', toggle, { enabled: () => shortcut, inEditable: false });

onMounted(() => {
  mounted.value = true;
});
</script>
