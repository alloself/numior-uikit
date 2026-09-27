# Pagination

`NuiPagination` is a `<nav>` with page buttons: the edges, the neighbours of the current page
and ellipses between them, "previous" and "next". Next to it sits the range line and, with
`pageSizes`, the page size select.

<Example name="pagination/Basic" />

## Installation

```ts
import { NuiPagination } from '@numior/vue';
import '@numior/vue/styles/pagination.css';
```

## Usage

<Configurator name="NuiPagination" />

## Examples

### Links instead of buttons

`href(page)` turns the buttons into links for a router and SEO, `edges` adds "first" and "last".

<Example name="pagination/Links" />

### A narrow container

The compact mode switches on by the width of the component itself: "previous", the "4 / 12"
status and "next" remain.

<Example name="pagination/Compact" />

## Behaviour

`siblings` and `boundaries` set how many pages are visible around the current one and at the
edges. The page is always clamped to the valid range, and a page size change recomputes it.

## Accessibility

A `<nav aria-label>` with a list; the current page carries `aria-current="page"`, every button
is named through `pageLabel`, the arrows through the dictionary. Unavailable arrows are
disabled and mirrored in RTL.

<KeyboardReference name="NuiPagination" />

## API

<ApiReference name="NuiPagination" />
