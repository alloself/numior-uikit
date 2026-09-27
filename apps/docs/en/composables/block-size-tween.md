# useBlockSizeTween

`useBlockSizeTween(target)` eases the element height towards the new content height through
`--nui-duration-normal` and `--nui-easing`: on a content change the element animates instead
of jumping. Under `prefers-reduced-motion` the transition is instant.

## Signature

<SignatureReference name="useBlockSizeTween" />

## Usage

```ts
import { useTemplateRef } from 'vue';
import { useBlockSizeTween } from '@numior/vue';

const panel = useTemplateRef<HTMLElement>('panel');

useBlockSizeTween(panel);
```

The composable measures the element before and after the change and writes `block-size`
straight into its styles, without reactive state. Disclosure panels and step switches animate
this way.
