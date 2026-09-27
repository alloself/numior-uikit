# useDirection

`useDirection(anchor)` tells which way the nearest area writes: from the configuration, from
the nearest `dir` attribute above `anchor`, from the document, else `ltr`. `provideDirection`
sets the direction of a subtree without an attribute.

## Signature

<SignatureReference :names="['useDirection', 'provideDirection', 'DirectionControl']" />

## Usage

```ts
import { computed, useTemplateRef } from 'vue';
import { useDirection } from '@numior/vue';

const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);
const arrow = computed(() => (direction.isRtl() ? 'arrow-left' : 'arrow-right'));
```

`dir()` and `isRtl()` are functions, not refs: read them inside a `computed` or a handler so
the value follows the configuration. The [Direction](/en/guide/direction) guide covers the
mirroring.
