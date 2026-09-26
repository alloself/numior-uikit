<template>
  <NuiButton
    variant="ghost"
    tone="neutral"
    size="sm"
    icon-only
    class="nui-sidebar-trigger"
    :aria-label="labelText"
    :aria-expanded="expanded ? 'true' : 'false'"
    :aria-controls="layout.sidebarId.value"
    @click="layout.toggle()"
  >
    <NuiIcon :alias="layout.mobile.value ? 'menu' : 'sidebar'" />
  </NuiButton>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useLayout } from '../layout/layout-context';
import { sidebarMessages } from './sidebar.messages';
import type { NuiSidebarTriggerProps } from './sidebar.types';

const { label } = defineProps<NuiSidebarTriggerProps>();

const layout = useLayout();
const messages = useMessages(sidebarMessages);

const labelText = computed(() => label ?? messages.value.toggle);

const expanded = computed(() =>
  layout.mobile.value ? layout.mobileOpen.value : layout.open.value,
);
</script>
