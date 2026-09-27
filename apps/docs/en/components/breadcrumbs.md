# Breadcrumbs

`NuiBreadcrumbs` is a `<nav>` with an ordered list of links whose last item carries
`aria-current="page"`. The separator is an icon from the registry, mirrored in RTL.

<Example name="breadcrumbs/Basic" />

## Installation

```ts
import { NuiBreadcrumbs } from '@numior/vue';
import '@numior/vue/styles/link.css';
import '@numior/vue/styles/breadcrumbs.css';
```

## Examples

### A long path

`maxItems` collapses the middle of the path into a “…” button that opens a menu with the hidden
links.

<Example name="breadcrumbs/Collapsed" />

### A custom crumb

The `item` slot receives `item`, `index` and `current` and replaces the default link; the
separators and the collapsing stay with the component.

<Example name="breadcrumbs/Custom" />

## Accessibility

The `<nav aria-label>` landmark and the `<ol>` list give the path its structure; the current
page is not a link. Links are taller than 24px, as WCAG 2.5.8 asks for standalone targets. For
a router pass `as` and `to` in the items; they reach the links inside the “…” menu too.

<KeyboardReference name="NuiBreadcrumbs" />

## API

<ApiReference name="NuiBreadcrumbs" />
