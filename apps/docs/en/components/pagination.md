# Pagination

`NuiPagination` switches pages of long tables and lists. It shows the first and last pages,
the neighbours of the current one, ellipses between them, and "previous" and "next" buttons.

<Example name="pagination/Basic" />

`total` is the number of records, and the page and its size live in `v-model:page` and
`v-model:page-size`. Next to the buttons sits the "21–40 of 240" line, and `pageSizes` adds a
choice of rows per page.

## Installation

```ts
import { NuiPagination } from '@numior/vue';
import '@numior/vue/styles/pagination.css';
```

## Usage

<Configurator name="NuiPagination" />

## Examples

### Links instead of buttons

Pass an `href(page)` function, and the pages become links: they open in a new tab and search
engines can follow them. The `as` prop plugs in `RouterLink` or another link component. `edges`
adds buttons that jump to the first and last pages.

<Example name="pagination/Links" />

### A narrow container

When the component runs out of room, the page numbers hide and "previous", "4 / 12" and "next"
remain. This depends on the width of the component itself, not of the browser window.

<Example name="pagination/Compact" />

## Behaviour

`siblings` sets how many pages are visible on each side of the current one, `boundaries` how
many at the start and the end. Both default to one. The component corrects a page number
out of range by itself, for example when there are fewer records.

When the user changes the page size, the component recalculates the page so that the first
visible record stays on screen. From page 5 of 20 records (81–100) a switch to 50 records leads
to page 2 (51–100).

## Accessibility

The component is a `<nav>` landmark with a list of pages, and the current page carries
`aria-current="page"`. A screen reader names the buttons "Page 4" and "Next page"; change these
labels through `pageLabel` and the dictionary. Unavailable arrows are disabled, and in
right-to-left text they point the other way.

<KeyboardReference name="NuiPagination" />

## API

<ApiReference name="NuiPagination" />
