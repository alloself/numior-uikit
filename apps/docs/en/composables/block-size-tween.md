# useBlockSizeTween

`useBlockSizeTween(target)` animates the height of an element when its content changes. Use it,
for example, for a panel that expands or a form with steps.

## Signature

<SignatureReference name="useBlockSizeTween" />

## Usage

```ts
import { useTemplateRef } from 'vue';
import { useBlockSizeTween } from '@numior/kit';

const panel = useTemplateRef<HTMLElement>('panel');

useBlockSizeTween(panel);
```

Call the composable in the component that renders the content: the height is measured before
and after each of its updates. The duration and easing come from the `--nui-duration-normal` and
`--nui-easing` tokens.

When reduced motion is on in the system, the height changes at once, without animation.
