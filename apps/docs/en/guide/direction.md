# Direction

The components are laid out with logical properties, so RTL needs only a `dir` attribute on
the document or an area. Fields align to the right, chevrons and pagination arrows flip, and
ArrowLeft and ArrowRight swap.

<Example name="guide/Direction" />

## Where the direction comes from

`useDirection(anchor)` reads `dir` from the configuration, else the nearest `dir` attribute
above the element, else the document `dir`, else `ltr`. The `dir` option of `createNuiConfig`
or `provideNuiConfig` matters when the direction changes on the fly or the server has no DOM.

```ts
createNuiConfig({ dir: () => (settings.rtl ? 'rtl' : 'ltr') });
```

## What flips

- Logical margins and borders: `margin-inline-start`, `inset-inline-end`, `border-inline-start`.
- Floating layers: the opening side of popovers and menus is computed from the direction.
- Keyboard: in lists, tabs, the tree and the splitter ArrowLeft and ArrowRight are mirrored.
- Time and number segments stay left to right, as digits do in RTL texts.

## Own code

Read the direction from `useDirection`, not from `getComputedStyle`. Inside a Vue component it
is an ordinary composable with `dir()` and `isRtl()`; on the server it returns the configured
value.

```ts
import { useDirection } from '@numior/vue';

const direction = useDirection(root);
const shift = computed(() => (direction.isRtl() ? -offset.value : offset.value));
```
