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

### Repeat the shape of a card

Put placeholders where the image, the title and the text will be, and the card keeps its size
when the data arrives.

<Example name="skeleton/Card" />

## Accessibility

Mark the container with `aria-busy` while the content loads:

```vue
<NuiCard :aria-busy="loading">
```

Screen readers do not see the placeholders, and `aria-busy` tells them that the content is still
loading.

With reduced motion turned on in the system, the shimmer stops.

## API

<ApiReference name="NuiSkeleton" />
