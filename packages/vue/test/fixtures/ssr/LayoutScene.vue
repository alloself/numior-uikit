<template>
  <NuiLayout id="shell" content-as="div">
    <template #sidebar>
      <NuiSidebar collapsible="icon" :variant="variant" :marker="marker" label="Sections">
        <NuiSidebarContent>
          <NuiSidebarGroup label="Overview">
            <NuiSidebarItem label="Inbox" icon="inbox" current />
            <NuiSidebarItem label="Docs" href="#docs" />
          </NuiSidebarGroup>
        </NuiSidebarContent>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start>
          <NuiSidebarTrigger />
        </template>
        <template #default>Inbox</template>
      </NuiAppBar>
    </template>
    <p>Content</p>
  </NuiLayout>
</template>

<script setup lang="ts">
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
  type NuiSidebarMarker,
  type NuiSidebarVariant,
} from '../../../src';

const { variant, marker } = defineProps<{
  variant?: NuiSidebarVariant | undefined;
  marker?: NuiSidebarMarker | undefined;
}>();
</script>
