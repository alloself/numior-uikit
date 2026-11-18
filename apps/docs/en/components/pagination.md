# Pagination

A page switcher for long lists and tables.

<Example name="pagination/Basic" />

Pass the number of records in `total`; `v-model:page` and `v-model:page-size` hold the page and
its size.

## Installation

```ts
import { NuiPagination } from '@numior/kit';
```

## Usage

Change the number of neighbor pages, the edge buttons and the size.

<Configurator name="NuiPagination" />

## Examples

### Make pages links

Pass an `href(page)` function.

<Example name="pagination/Links" />

The pages become links that users open in a new tab and search engines follow. Pass `RouterLink`
or another link component in `as`.

### Fit a narrow container

<Example name="pagination/Compact" />

In a narrow container the page numbers hide, and the arrows stay with "4 / 6" between them. The
component reacts to its own width, not to the width of the window.

## Behavior

A page number out of range moves to the nearest page, for example when the list gets shorter.

When the user changes the page size, the page changes so that the first visible record stays on
screen. From page 5 at 20 rows (81–100) a switch to 50 rows leads to page 2 (51–100).

## Accessibility

The component is a `nav` landmark with a list of pages, and the current page carries
`aria-current="page"`. A screen reader names the buttons "Page 4" and "Next page", and the label
props and the dictionary change these texts. Arrows that lead nowhere are disabled, and in
right-to-left text they point the other way.

<KeyboardReference name="NuiPagination" />

## API

<ApiReference name="NuiPagination" />
