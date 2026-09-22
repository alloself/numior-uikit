# Button

`NuiButton` is a native `<button>` styled along two axes. `variant` picks the shape:
`solid`, `soft`, `outline`, `ghost`, `link`. `tone` picks the semantic role:
`primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.
The default is `solid` + `primary`. Each role reads its `--nui-<role>` tokens, so a
runtime accent change affects every variant at once.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton>Save</NuiButton>
  <NuiButton variant="soft" tone="success">Done</NuiButton>
  <NuiButton variant="outline" tone="error">Delete</NuiButton>
  <NuiButton variant="ghost" tone="neutral">Cancel</NuiButton>
  <NuiButton variant="link">Learn more</NuiButton>
</div>

```vue
<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles/button.css';
</script>

<template>
  <NuiButton>Save</NuiButton>
  <NuiButton variant="soft" tone="success">Done</NuiButton>
  <NuiButton variant="outline" tone="error">Delete</NuiButton>
  <NuiButton variant="ghost" tone="neutral">Cancel</NuiButton>
  <NuiButton variant="link">Learn more</NuiButton>
</template>
```

`@numior/vue/styles.css` loads the styles of every component; `@numior/vue/styles/button.css`
loads only the button. CSS is never imported from JavaScript automatically.

## Sizes

`size` picks the `sm`, `md` or `lg` step inside the current scale; `data-nui-density`
shifts the whole scale. Heights are 2 / 2.5 / 3rem in `comfortable` and 1.75 / 2 / 2.5rem
in `compact`.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton size="sm">Small</NuiButton>
  <NuiButton>Default</NuiButton>
  <NuiButton size="lg">Large</NuiButton>
</div>

## States

`disabled` prevents activation. `loading` also blocks the button, sets
`aria-busy="true"` and shows the `loader` icon from the icon registry before the slot
content. `type` defaults to `button`, so a button inside a form never submits it by
accident; `submit` and `reset` are available.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton disabled>Disabled</NuiButton>
  <NuiButton loading>Saving</NuiButton>
</div>

## Accessibility

The component stays a native button: keyboard, focus and screen readers work without
extra JavaScript. The focus ring uses `--nui-focus`. A button without visible text
needs an accessible name, such as `aria-label`. In the `light` and `dark` themes the
`solid`, `soft`, `outline`, `ghost` and `link` variants pass the automated axe contrast
scan in the playground; that does not replace a manual review.

## API

| Prop       | Type                                                                                   | Default     |
| ---------- | -------------------------------------------------------------------------------------- | ----------- |
| `variant`  | `'solid' \| 'soft' \| 'outline' \| 'ghost' \| 'link'`                                  | `'solid'`   |
| `tone`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'` | `'primary'` |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`      |
| `type`     | `'button' \| 'submit' \| 'reset'`                                                      | `'button'`  |
| `disabled` | `boolean`                                                                              | `false`     |
| `loading`  | `boolean`                                                                              | `false`     |

The default slot is the button content. Native attributes, classes and event listeners
reach the `<button>` element. The `data-variant`, `data-tone` and `data-size`
attributes are available for styling and for Tailwind variants such as `data-[tone=error]:`.
