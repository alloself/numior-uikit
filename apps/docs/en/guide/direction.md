# Direction

How to render the interface right to left for Arabic, Hebrew and other RTL languages.

<Example name="guide/Direction" />

Put the `dir="rtl"` attribute on `<html>` or on the element that needs RTL. Text in inputs
moves to the right, chevrons and pagination arrows flip, and ArrowLeft and ArrowRight swap.

## Direction in the settings

Pass `dir` to `createNuiConfig` or `provideNuiConfig` when the direction switches at runtime or
the page renders on the server:

```ts
createNuiConfig({ dir: () => (settings.rtl ? 'rtl' : 'ltr') });
```

When the settings have no `dir`, a component takes the nearest `dir` attribute above it, then
the document attribute. When there is no attribute at all, the direction is `ltr`.

## What flips

- Margins, borders and positions set with logical properties: `margin-inline-start`,
  `inset-inline-end`, `border-inline-start`.
- Start and end alignment of popovers and menus, for example `bottom-start`.
- The ArrowLeft and ArrowRight keys in lists, tabs, the tree and the splitter.

Time and number fields stay left to right, as digits are written in RTL texts too.

## Your own component

In your own components, get the direction from `useDirection`, not from `getComputedStyle`. On
the server `useDirection` returns the value from the settings:

```ts
import { useDirection } from '@numior/vue';

const direction = useDirection(root);
const shift = computed(() => (direction.isRtl() ? -offset.value : offset.value));
```

`isRtl()` and `dir()` are functions. Call them inside `computed` so the value updates when the
settings change.
