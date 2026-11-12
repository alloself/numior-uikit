# Skeleton

`NuiSkeleton` is a grey placeholder in place of text, an image or an avatar while data loads.
The page gets its shape right away and does not jump when the data arrives.

<Example name="skeleton/Basic" />

`shape` picks the form: `text` for lines of text, `rect` for a rectangle, `circle` for a circle.
`lines` sets the number of lines, `width` and `height` the size. A shimmer runs across the
placeholder, and `:animated="false"` turns it off.

## Installation

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Usage

<Configurator name="NuiSkeleton" />

## Examples

### A card while loading

[Card](/en/components/card) has placeholders of its own. The `loading` prop puts them where the
title, the description, the text and the image will be, and the card header keeps its size.

<Example name="card/Loading" />

## Accessibility

A screen reader does not see the placeholder and learns nothing about loading from it. Mark the
container with `aria-busy="true"` while loading, or show a [Progress](/en/components/progress)
with a label next to it. `NuiCard` with `loading` sets `aria-busy` itself.

When reduced motion is on in the system, the shimmer stays still.

## API

<ApiReference name="NuiSkeleton" />
