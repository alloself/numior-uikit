<template>
  <NuiLayout id="shell" content-as="div">
    <template #sidebar>
      <NuiSidebar collapsible="icon" :variant="variant" label="Sections">
        <NuiSidebarContent>
          <NuiSidebarGroup label="Overview">
            <NuiSidebarItem label="Inbox" icon="inbox" current />
            <NuiSidebarItem label="Docs" href="#docs" />
          </NuiSidebarGroup>
          <NuiSidebarGroup label="Data">
            <NuiSidebarSub id="reports" label="Reports" icon="folder" active>
              <NuiSidebarItem label="Sales" href="#sales" />
            </NuiSidebarSub>
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
  NuiSidebarSub,
  NuiSidebarTrigger,
  type NuiSidebarVariant,
} from '../../../src';

const { variant } = defineProps<{ variant?: NuiSidebarVariant | undefined }>();
</script>
