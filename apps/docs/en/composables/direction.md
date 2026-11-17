# useDirection

`useDirection(anchor)` tells which way text runs where the `anchor` element is: `ltr` or `rtl`.
Use it in your own components that must mirror in RTL.

The direction comes from the settings, then from the nearest `dir` attribute above `anchor`,
then from the document attribute. When there is none, it is `ltr`. `provideDirection(dir)` sets
the direction for everything inside a component without a `dir` attribute.

## Signature

<SignatureReference :names="['useDirection', 'provideDirection', 'DirectionControl']" />

## Usage

```ts
import { computed, useTemplateRef } from 'vue';
import { useDirection } from '@numior/kit';

const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);
const arrow = computed(() => (direction.isRtl() ? 'arrow-left' : 'arrow-right'));
```

`dir()` and `isRtl()` are functions, not refs. Call them inside `computed` or a handler to get
the current value. What flips in Numior UI components in RTL is covered in the
[RTL](/en/guide/direction) guide.
