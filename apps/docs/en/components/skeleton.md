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

Put placeholders where the title and the text will be, and give them a similar width. Then the
card keeps its size after loading.

<Example name="skeleton/Card" />

## Accessibility

A screen reader does not see the placeholder and learns nothing about loading from it. Mark the
container with `aria-busy="true"` while loading, or show a [Progress](/en/components/progress)
with a label next to it.

When reduced motion is on in the system, the shimmer stays still.

## API

<ApiReference name="NuiSkeleton" />
