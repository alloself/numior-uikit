# Toc

`NuiToc` is the outline of an article: a list of links to its headings that highlights the
section being read. The outline on the right of this site is built with `NuiToc`.

<Example name="toc/Basic" />

Items are set in `items`: each has the heading `id` and a `label`. Nested `children` add the
second and third levels.

## Installation

```ts
import { NuiToc } from '@numior/vue';
import '@numior/vue/styles/toc.css';
```

## Behaviour

The highlighted item is the last heading that has scrolled above the `line`. The line is a share
of the window height, `0.2` by default, which is one fifth from the top. When the article scrolls
inside its own block, pass that block to `root`.

After a click on a link the highlight moves to it at once and does not jump to a neighbour until
the scroll ends. The `select` event fires with the `id` of the chosen heading.

## Accessibility

The outline is a `nav` element named for screen readers by `label`, or by the "On this page"
title without it. The links are plain `<a href="#id">`, and the current one has
`aria-current="location"`.

## API

<ApiReference name="NuiToc" />
