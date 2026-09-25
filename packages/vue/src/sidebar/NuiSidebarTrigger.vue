<template>
  <NuiButton
    variant="ghost"
    tone="neutral"
    size="sm"
    icon-only
    class="nui-sidebar-trigger"
    :aria-label="label"
    :aria-expanded="expanded ? 'true' : 'false'"
    :aria-controls="layout.sidebarId.value"
    @click="layout.toggle()"
  >
    <NuiIcon :alias="layout.mobile.value ? 'menu' : 'sidebar'" />
  </NuiButton>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useLayout } from '../layout/layout-context';
import type { NuiSidebarTriggerProps } from './sidebar.types';

const { label = 'Toggle sidebar' } = defineProps<NuiSidebarTriggerProps>();

const layout = useLayout();

const expanded = computed(() =>
  layout.mobile.value ? layout.mobileOpen.value : layout.open.value,
);
</script>
