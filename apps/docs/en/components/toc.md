# Toc

An article outline that highlights the section being read.

<Example name="toc/Basic" />

Pass the headings in `items`: each has the `id` of a heading and a `label`, and `children` adds
nested levels.

## Installation

```ts install
import { NuiToc } from '@numior/vue';
```

## Behavior

The highlighted item is the last heading that has scrolled above the reading line. The `line`
prop sets it as a share of the height, `0.2` by default, one fifth from the top. When the article
scrolls inside its own block, pass that block to `root`.

After a click on a link the highlight moves to it at once and stays there until the scroll ends.
The `select` event receives the `id` of the chosen heading.

## Accessibility

The outline is a `nav` element that a screen reader announces by `label`, "On this page" by
default. The links are plain `<a href="#id">` elements, and the current one has
`aria-current="location"`.

## API

<ApiReference name="NuiToc" />
