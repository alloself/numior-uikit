# Layout and sidebar

`NuiLayout` assembles the app shell: a sidebar, the `NuiAppBar` top bar and the content
area. The sidebar state lives in the layout (`v-model:open` for desktop, `v-model:mobile-open`
for narrow screens) while the `NuiSidebar*` family describes the panel itself: a header,
scrollable content with groups of items, nested lists and a footer. On a narrow screen
(`mobileQuery`, `(max-width: 48rem)` by default) the panel turns into a sliding `NuiDrawer`
opened by `NuiSidebarTrigger`.

<script setup>
import { ref } from 'vue'
const open = ref(true)
const active = ref('inbox')
const reports = ref(false)
const titles = { inbox: 'Inbox', calendar: 'Calendar', sales: 'Report: sales', team: 'Report: team' }
</script>

<div class="vp-raw nui-demo nui-demo--frame" data-nui-theme="light">
  <NuiLayout v-model:open="open" content-as="div" style="block-size: 22rem">
    <template #sidebar>
      <NuiSidebar collapsible="icon" label="Sections">
        <NuiSidebarHeader><strong style="padding-inline: 0.5rem">Numior</strong></NuiSidebarHeader>
        <NuiSidebarContent>
          <NuiSidebarGroup label="Overview">
            <NuiSidebarItem label="Inbox" icon="inbox" :badge="3" :current="active === 'inbox'" @click="active = 'inbox'" />
            <NuiSidebarItem label="Calendar" icon="calendar" :current="active === 'calendar'" @click="active = 'calendar'" />
          </NuiSidebarGroup>
          <NuiSidebarGroup label="Data">
            <NuiSidebarSub v-model:open="reports" label="Reports" icon="folder" :active="active === 'sales' || active === 'team'">
              <NuiSidebarItem label="Sales" :current="active === 'sales'" @click="active = 'sales'" />
              <NuiSidebarItem label="Team" :current="active === 'team'" @click="active = 'team'" />
            </NuiSidebarSub>
            <NuiSidebarItem label="Documentation" icon="file" href="#docs" />
          </NuiSidebarGroup>
        </NuiSidebarContent>
        <NuiSidebarFooter>
          <NuiSidebarGroup><NuiSidebarItem label="Anna Ivanova" icon="user" tooltip="Profile" /></NuiSidebarGroup>
        </NuiSidebarFooter>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start><NuiSidebarTrigger /></template>
        {{ titles[active] }}
      </NuiAppBar>
    </template>
    <p style="padding: 1rem">Section “{{ titles[active] }}”. Press Ctrl/Cmd+B.</p>
  </NuiLayout>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
} from '@numior/vue';
import '@numior/vue/styles/layout.css';
import '@numior/vue/styles/sidebar.css';

const open = ref(true);
</script>

<template>
  <NuiLayout v-model:open="open">
    <template #sidebar>
      <NuiSidebar collapsible="icon" label="Sections">
        <NuiSidebarContent>
          <NuiSidebarGroup label="Overview">
            <NuiSidebarItem label="Inbox" icon="inbox" to="/inbox" as="RouterLink" current />
            <NuiSidebarItem label="Calendar" icon="calendar" to="/calendar" as="RouterLink" />
          </NuiSidebarGroup>
        </NuiSidebarContent>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start><NuiSidebarTrigger /></template>
        Inbox
      </NuiAppBar>
    </template>
    <RouterView />
  </NuiLayout>
</template>
```

## Behaviour

`collapsible` decides what collapsing means: `icon` leaves a narrow rail of icons whose labels
appear in tooltips, `offcanvas` moves the panel off the edge and makes it `inert`, `none`
never collapses. `side` docks the panel at the start or the end of the row and follows the
writing direction. Ctrl/Cmd+B toggles the panel from anywhere except editable fields
(`shortcut=false` turns it off). A nested `NuiSidebarSub` list opens from a button with
`aria-expanded`; in the rail it stays closed and a press expands the sidebar first. On a
narrow screen the panel renders inside a `NuiDrawer` titled by `title` (the `label` by
default); picking an item closes the drawer. Before mount `useMediaQuery` reports a wide
screen, so the server markup and the first frame agree.

## Accessibility

The panel is an `aside` with `aria-label`, its content a `nav`, a group is a
`NuiList variant="nav"` labelled through `aria-labelledby`, and an item is a `NuiListItem`:
the current one carries `aria-current="page"`, items with a destination render through
`NuiLink` (`href`, `to`, `as`), the rest are buttons. The trigger button keeps
`aria-expanded` and `aria-controls` of the panel or the drawer. In the rail item labels are
visually hidden but stay their accessible names, and the tooltip with the label is a visual
hint without `aria-describedby`.

## API

`NuiLayout`: `v-model:open` (`true`), `v-model:mobile-open` (`false`), `sidebarWidth`
(`16rem`), `railWidth` (`3.5rem`), `mobileQuery` (`(max-width: 48rem)`), `shortcut` (`true`),
`contentAs` (`main`), `id`. Slots `sidebar`, `header`, default.

`NuiAppBar`: `sticky` (`true`); slots `start`, default, `end`.

`NuiSidebar`: `collapsible` (`offcanvas`), `side` (`start`), `label` (dictionary: “Navigation”), `title`,
`closeLabel`. Parts: `NuiSidebarHeader`, `NuiSidebarContent` (`label`), `NuiSidebarFooter`,
`NuiSidebarGroup` (`label`, `items` — `NuiListEntry` records instead of the slot),
`NuiSidebarItem` (`label`, `icon`, `href`, `to`, `as`, `current`, `disabled`, `badge`,
`tooltip`; default and `trailing` slots), `NuiSidebarSub` (`label`, `icon`, `active` — the
current page is inside, `id`, `v-model:open`), `NuiSidebarTrigger` (`label`, dictionary: “Toggle sidebar”). Texts come from the
[dictionary](/en/guide/localization#sidebar).

Blocks `nui-layout` (`--mobile`, `--sidebar-open`; `__body`, `__content`; variables
`--_sidebar-size`, `--_rail-size`, `--_bar-size`), `nui-app-bar` (`--sticky`; `__start`,
`__body`, `__end`), `nui-sidebar` (`--side-*`, `--collapsible-*`, `--collapsed`, `--rail`,
`--mobile`; `__header`, `__content`, `__footer`), `nui-sidebar-group` (`__label`),
`nui-sidebar-sub` (`--open`, `--active`; `__chevron`, `__panel`, `__list`),
`nui-sidebar-trigger`; rows are the [list](/en/components/list) blocks
`nui-list--variant-nav` and `nui-list-item` (`--current`, `--disabled`).

The `useMediaQuery(query)` primitive from `@numior/primitives` returns `false` before mount
and follows `matchMedia` afterwards.
