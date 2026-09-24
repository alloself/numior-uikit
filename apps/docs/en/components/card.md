# Card

`NuiCard` is a surface container: `variant` sets the look (`outline`, `elevated`, `soft`)
and `padding` the inner spacing. Content is composed from the parts `NuiCardHeader`
(`actions` slot), `NuiCardTitle` (`as` tag, `h3` by default), `NuiCardDescription`,
`NuiCardContent`, `NuiCardFooter` and `NuiCardMedia` (an image bleeding to the edge, with
`aspect`). The `title` and `description` props render the header without parts. `href`/`to`
or `interactive` turn the whole card into a link or a button.

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiCard href="#card">
    <NuiCardMedia src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='100' fill='url(%23g)'/%3E%3C/svg%3E" alt="" aspect="3 / 1" />
    <NuiCardHeader>
      <NuiCardTitle>Team plan</NuiCardTitle>
      <NuiCardDescription>The whole card is one link.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardFooter><NuiBadge tone="success">Available</NuiBadge></NuiCardFooter>
  </NuiCard>
  <NuiCard interactive variant="elevated">
    <NuiCardHeader>
      <NuiCardTitle>Numior project</NuiCardTitle>
      <NuiCardDescription>A button card with an independent action in the header.</NuiCardDescription>
      <template #actions>
        <NuiButton variant="ghost" tone="neutral" size="sm" aria-label="More"><NuiIcon alias="ellipsis" /></NuiButton>
      </template>
    </NuiCardHeader>
    <NuiCardContent>Click anywhere to open the project.</NuiCardContent>
  </NuiCard>
  <NuiCard variant="soft" padding="sm" title="Quiet card" description="Not interactive, small padding">
    <NuiCardContent>Content</NuiCardContent>
  </NuiCard>
</div>

```vue
<script setup lang="ts">
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
} from '@numior/vue';
import '@numior/vue/styles/card.css';
</script>

<template>
  <NuiCard :to="{ name: 'plan', params: { id } }" :as="RouterLink">
    <NuiCardMedia :src="plan.cover" alt="" />
    <NuiCardHeader>
      <NuiCardTitle>{{ plan.name }}</NuiCardTitle>
      <NuiCardDescription>{{ plan.summary }}</NuiCardDescription>
      <template #actions><NuiButton size="sm" variant="ghost" aria-label="More" /></template>
    </NuiCardHeader>
    <NuiCardContent>…</NuiCardContent>
  </NuiCard>
</template>
```

## Interactive card

A clickable card is not wrapped in an `<a>` or `<button>` as a whole: the link's name would
become the card's entire text and nested buttons would be invalid. Instead `NuiCardTitle`
renders the single focusable element inside the heading, a `NuiLink` (for `href`/`to`, the
router through `as`) or a `<button>` (for `interactive`), and stretches it over the card with
a pseudo-element. The link's name equals the title, so an interactive card needs a
`NuiCardTitle` or the `title` prop. Controls in `actions` and `footer` are raised above the
stretched area and work independently; `@click` on `NuiCard` receives both surface clicks
(through the action) and nested button clicks, so tell them apart with
`event.target.closest('.nui-card__action')`. The focus ring is drawn around the whole card.

## API

| Prop          | Type                                | Default     | Description                               |
| ------------- | ----------------------------------- | ----------- | ----------------------------------------- |
| `variant`     | `'outline' \| 'elevated' \| 'soft'` | `'outline'` | Surface look                              |
| `padding`     | `'sm' \| 'md' \| 'lg'`              | `'md'`      | Inner spacing                             |
| `href`, `to`  | `string`, `unknown`                 | —           | Makes the card a link (`to` for a router) |
| `as`          | `string \| Component`               | `'a'`       | Router component for `to`                 |
| `interactive` | `boolean`                           | `false`     | Button card                               |
| `title`       | `string`                            | —           | Title without parts                       |
| `description` | `string`                            | —           | Description without parts                 |

`NuiCardTitle`: `as` is `h2`…`h6` (`'h3'`). `NuiCardMedia`: `src`, `alt` (`''`), `aspect`
(`'16 / 9'`), a slot instead of the picture (the `image` icon by default). Block `nui-card`,
modifiers `--variant-*`, `--padding-*`, `--interactive`; elements `__header`, `__heading`,
`__actions`, `__title`, `__action`, `__description`, `__content`, `__footer`, `__media`,
`__image`, `__placeholder`; variables `--_padding`, `--_gap`, `--_radius`, `--_surface`,
`--_border`, `--_shadow`, `--_aspect`.
