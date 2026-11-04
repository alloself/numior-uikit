# Badge

`NuiBadge` is a small label with a status, a counter or a coloured dot: "Draft", "Paid", "3". A
label the user can remove is a [Chip](/en/components/chip).

<Example name="badge/Basic" />

## Installation

```ts
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
```

## Usage

The `tone` prop sets the colour, and `variant` the fill: `soft`, `outline` or `solid`. `size`
accepts `sm` and `md`.

<Configurator name="NuiBadge" />

## Examples

### Counter, dot and corner

The `count` prop shows a number. When it exceeds `max`, the badge shows `max` with a plus, which
is "99+" with the default `max`. `dot` reduces the badge to a single dot.

<Example name="badge/Count" />

With `floating` the badge sits in the top corner of its parent, such as a button. It goes on the
right, or on the left in right-to-left text. The parent needs `position: relative`.

## Accessibility

A screen reader reads the badge text or number together with the surrounding text. It names a
dot by its `label` and skips a dot without one.

## API

<ApiReference name="NuiBadge" />
