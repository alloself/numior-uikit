<template>
  <NuiLayout id="shell" content-as="div" :header="header">
    <template #sidebar>
      <NuiSidebar collapsible="icon" :variant="variant" :marker="marker" label="Sections">
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
    <template v-if="footer" #footer><footer>Legal</footer></template>
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
  type NuiLayoutHeader,
  type NuiSidebarMarker,
  type NuiSidebarVariant,
} from '../../../src';

const {
  variant,
  marker,
  header = 'inset',
  footer = false,
} = defineProps<{
  variant?: NuiSidebarVariant | undefined;
  marker?: NuiSidebarMarker | undefined;
  header?: NuiLayoutHeader;
  footer?: boolean;
}>();
</script>
