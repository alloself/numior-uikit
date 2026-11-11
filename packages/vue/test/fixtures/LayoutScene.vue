<template>
  <NuiLayout
    id="app"
    v-model:open="open"
    v-model:mobile-open="mobileOpen"
    :shortcut="shortcut"
    :header="header"
    :sticky="sticky"
    content-as="div"
    :skip-link="skipLink"
    :skip-label="skipLabel"
  >
    <template #sidebar>
      <NuiSidebar
        :collapsible="collapsible"
        :side="side"
        :label="label"
        :variant="variant"
        :marker="marker"
      >
        <NuiSidebarHeader><strong>Brand</strong></NuiSidebarHeader>
        <NuiSidebarContent>
          <NuiSidebarGroup id="overview" label="Overview" :collapsible="collapsibleGroup">
            <NuiSidebarItem
              label="Inbox"
              icon="inbox"
              :current="active === 'inbox'"
              :badge="3"
              @click="active = 'inbox'"
            />
            <NuiSidebarItem
              label="Calendar"
              icon="inbox"
              :current="active === 'calendar'"
              @click="active = 'calendar'"
            />
            <NuiSidebarItem
              label="Docs"
              icon="inbox"
              :current="active === 'docs'"
              href="#docs"
              @click="active = 'docs'"
            />
          </NuiSidebarGroup>
          <NuiSidebarGroup label="Data">
            <NuiSidebarSub id="reports" v-model:open="subOpen" label="Reports" icon="folder">
              <NuiSidebarItem
                label="Sales"
                icon="inbox"
                :current="active === 'sales'"
                @click="active = 'sales'"
              />
              <NuiSidebarItem
                label="Team"
                icon="inbox"
                :current="active === 'team'"
                @click="active = 'team'"
              />
            </NuiSidebarSub>
          </NuiSidebarGroup>
        </NuiSidebarContent>
        <NuiSidebarFooter>
          <NuiSidebarGroup>
            <NuiSidebarItem
              label="Profile"
              icon="inbox"
              :current="active === 'profile'"
              tooltip="Open profile"
              @click="active = 'profile'"
            />
          </NuiSidebarGroup>
        </NuiSidebarFooter>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start><NuiSidebarTrigger /></template>
        {{ active }}
      </NuiAppBar>
    </template>
    <input class="editor" type="text" />
    <p>Content</p>
    <template v-if="end" #end><nav>Outline</nav></template>
  </NuiLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarHeader,
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
  type NuiLayoutHeader,
  type NuiSidebarCollapsible,
  type NuiSidebarMarker,
  type NuiSidebarSide,
  type NuiSidebarVariant,
} from '../../src';

const {
  collapsible,
  side,
  shortcut,
  label,
  header,
  end,
  sticky,
  collapsibleGroup,
  variant,
  marker,
  skipLink = undefined,
  skipLabel,
} = defineProps<{
  collapsible: NuiSidebarCollapsible;
  side: NuiSidebarSide;
  shortcut: boolean;
  label?: string | undefined;
  header: NuiLayoutHeader;
  end: boolean;
  sticky: boolean;
  collapsibleGroup: boolean;
  variant: NuiSidebarVariant;
  marker?: NuiSidebarMarker | undefined;
  skipLink?: boolean | undefined;
  skipLabel?: string | undefined;
}>();

const open = defineModel<boolean>('open', { required: true });

const mobileOpen = ref(false);

const subOpen = ref(false);

const active = ref('inbox');

defineExpose({ open, mobileOpen, subOpen, active });
</script>
