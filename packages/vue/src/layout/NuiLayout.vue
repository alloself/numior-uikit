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
    <NuiSkipLink v-if="skipLink" :target="contentId" :label="skipLabel" />
    <slot v-if="header === NuiLayoutHeader.Full" name="header" />
    <div class="nui-layout__row">
      <slot name="sidebar" />
      <div class="nui-layout__body">
        <slot v-if="header === NuiLayoutHeader.Inset" name="header" />
        <component :is="contentAs" :id="contentId" class="nui-layout__content">
          <slot />
        </component>
        <slot v-if="header === NuiLayoutHeader.Inset" name="footer" />
      </div>
      <div v-if="$slots.end" class="nui-layout__end">
        <slot name="end" />
      </div>
    </div>
    <slot v-if="header === NuiLayoutHeader.Full" name="footer" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useControlId, useHotkey, useMediaQuery } from '@numior/primitives';
import NuiSkipLink from '../skip-link/NuiSkipLink.vue';
import { provideLayout } from './layout-context';
import { NuiLayoutHeader, type NuiLayoutProps } from './layout.types';

const {
  id,
  header = NuiLayoutHeader.Inset,
  sidebarWidth = '16rem',
  railWidth = '3.5rem',
  endWidth = '14rem',
  mobileQuery = '(max-width: 48rem)',
  shortcut = true,
  sticky = false,
  contentAs = 'main',
  skipLink = true,
  skipLabel,
} = defineProps<NuiLayoutProps>();

const open = defineModel<boolean>('open', { default: true });
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false });

defineSlots<{
  sidebar?(): unknown;
  header?(): unknown;
  default?(): unknown;
  end?(): unknown;
  footer?(): unknown;
}>();

const mobile = useMediaQuery(() => mobileQuery);
const mounted = ref(false);
const sidebarId = useControlId(() => (id === undefined ? undefined : `${id}-sidebar`));
const contentId = useControlId(() => (id === undefined ? undefined : `${id}-content`));

const toggle = (): void => {
  if (mobile.value) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    open.value = !open.value;
  }
};

watch(mobile, (isMobile) => {
  if (isMobile) {
    return;
  }

  mobileOpen.value = false;
});

provideLayout({ open, mobileOpen, mobile, sidebarId, toggle });
useHotkey('mod+b', toggle, { enabled: () => shortcut, inEditable: false });

onMounted(() => {
  mounted.value = true;
});
</script>
