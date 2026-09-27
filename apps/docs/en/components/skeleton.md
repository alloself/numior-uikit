# Skeleton

`NuiSkeleton` is a decorative placeholder while data loads: `aria-hidden`, a shimmering gradient
on the surface tokens. Under `prefers-reduced-motion` the shimmer is off, `animated="false"`
does the same explicitly.

<Example name="skeleton/Basic" />

## Installation

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Usage

<Configurator name="NuiSkeleton" />

## Examples

### A card while loading

The placeholders take the place of the text, so the layout does not jump when the data arrives.

<Example name="skeleton/Card" />

## Accessibility

A skeleton does not announce loading on its own. Mark the container with `aria-busy="true"` or
show a `NuiProgress` with a label, so a screen reader learns about the process.

## API

<ApiReference name="NuiSkeleton" />
