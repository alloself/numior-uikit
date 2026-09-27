# Badge

`NuiBadge` is a non-interactive label smaller than a chip: a status, a counter or a status dot.
`tone` sets the colour, `variant` the look, `size` the height. Removable values belong to
[Chip](/en/components/chip).

<Example name="badge/Basic" />

## Installation

```ts
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
```

## Usage

<Configurator name="NuiBadge" />

## Examples

### Counter, dot and corner

`count` with `max` shows the number and "99+", and `dot` draws only a dot. `floating` places the
badge in the corner of a parent with `position: relative`.

<Example name="badge/Count" />

## Accessibility

A badge is a `<span>` without a role; its text is read with its surroundings. A dot or a
counter without text gets `role="img"` and a name from `label`. A dot without `label` counts as
decorative and is hidden from assistive technology.

## API

<ApiReference name="NuiBadge" />
