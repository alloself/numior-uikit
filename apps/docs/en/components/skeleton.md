# Skeleton

A placeholder that holds the place of content while it loads.

<Example name="skeleton/Basic" />

## Installation

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Usage

Change the shape of the placeholder, the number of lines and the shimmer.

<Configurator name="NuiSkeleton" />

## Examples

### Show a loading card

Set `loading` on the card to put placeholders where the image, the title and the text go.

<Example name="card/Loading" />

## Accessibility

Mark the container with `aria-busy` while the content loads:

```vue
<section :aria-busy="loading">
```

Screen readers do not see the placeholders, and `aria-busy` tells them that the content is still
loading. `NuiCard` with `loading` sets `aria-busy` itself.

With reduced motion turned on in the system, the shimmer stops.

## API

<ApiReference name="NuiSkeleton" />
