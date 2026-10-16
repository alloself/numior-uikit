# Layout

`NuiLayout` assembles the app shell: the sidebar, the `NuiAppBar` top bar and the content area.
The sidebar state lives in the layout: `v-model:open` on a wide screen, `v-model:mobileOpen`
for the drawer on a narrow one. The sidebar itself is described by
[Sidebar](/en/components/sidebar).

<Example name="layout/Basic" />

## Installation

```ts
import { NuiAppBar, NuiLayout } from '@numior/vue';
import '@numior/vue/styles/layout.css';
import '@numior/vue/styles/skip-link.css';
```

## Examples

### A full-width bar and an end column

`header="full"` puts the top bar above the sidebar, and the `end` slot adds a column for a table
of contents. `sticky` keeps the columns at the viewport height with their own scrolling.

<Example name="layout/Full" />

## Behaviour

On a narrow screen (`mobileQuery`, `(max-width: 48rem)` by default) the sidebar renders inside
a `NuiDrawer` and `NuiSidebarTrigger` opens it; picking an item closes the drawer. Before
mounting the screen counts as wide, so the server markup and the first frame match. Ctrl/Cmd+B
toggles the sidebar outside input fields.

## Accessibility

The content area is a `main` (or `contentAs`) and the top bar a `header`. The trigger button
holds `aria-expanded` and `aria-controls` of the sidebar or the drawer.

The layout starts with a `NuiSkipLink` «Skip to content» (WCAG 2.4.1). The link shows only
with keyboard focus and moves it into the content area past the bar and the sidebar. `skipLabel` changes the text, `:skip-link="false"` drops the link when the page already
has one.

<KeyboardReference name="NuiLayout" />

## API

<ApiReference :names="['NuiLayout', 'NuiAppBar', 'NuiSkipLink']" />
