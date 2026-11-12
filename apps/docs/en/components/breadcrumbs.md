# Breadcrumbs

`NuiBreadcrumbs` shows the path from the home page to the current one. Every step of the path is
a link, and the last step is the name of the current page.

<Example name="breadcrumbs/Basic" />

## Installation

```ts
import { NuiBreadcrumbs } from '@numior/vue';
import '@numior/vue/styles/link.css';
import '@numior/vue/styles/breadcrumbs.css';
```

## Usage

Collapse a long path to the number of steps you need and pick a separator.

<Configurator name="NuiBreadcrumbs" />

## Examples

### A long path

The `maxItems` prop limits the number of visible steps. The first and the last steps stay in
place, and the middle collapses into a “…” button that opens a menu with the hidden links.

<Example name="breadcrumbs/Collapsed" />

### A custom crumb

The `item` slot replaces the link of a step with your own markup. The slot receives `item`,
`index` and `current`, and the component still draws the separators and the collapsing.

<Example name="breadcrumbs/Custom" />

## Behaviour

Steps are passed in `items`: each has a `label`, an address in `href` or `to` and an optional
`icon`. With `to` a step becomes the app's `RouterLink` or `NuxtLink`, and the `as` prop puts
another link component in its place. Links in the “…” menu work the same way.

The `separator` prop changes the icon between the steps, an arrow by default. In right-to-left
text the arrow is mirrored.

## Accessibility

The trail is a `<nav>` landmark labelled by `label`, "Breadcrumb" by default. The current page
is marked with `aria-current="page"` and does not link to itself. Links are at least 24px tall,
as WCAG 2.5.8 requires.

<KeyboardReference name="NuiBreadcrumbs" />

## API

<ApiReference name="NuiBreadcrumbs" />
