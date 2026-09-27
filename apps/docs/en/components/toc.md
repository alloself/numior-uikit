# Toc

`NuiToc` is the "On this page" outline of an article: a list of links to headings whose
current item follows the scroll. The right column of these docs is built on it.

<Example name="toc/Basic" />

## Installation

```ts
import { NuiToc } from '@numior/vue';
import '@numior/vue/styles/toc.css';
```

## Behaviour

The current heading is the last one whose top is above the `line`. The line is a share of
the window or `root` container height, 0.2 by default. A click marks its link at once and
keeps the mark until the scroll settles, so the item does not jump to a neighbour.

Items come from `items`, nested `children` give the second and third levels.

## Accessibility

The root is a `nav` named by `label` or the title, the links are plain `<a href="#id">`; the
current one carries `aria-current="location"`.

## API

<ApiReference name="NuiToc" />
