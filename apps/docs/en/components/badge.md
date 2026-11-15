# Badge

A short label for a status or a count.

<Example name="badge/Basic" />

For a label the user can remove, use a [Chip](/en/components/chip).

## Installation

```ts install
import { NuiBadge } from '@numior/vue';
```

## Usage

Change the color, the fill and the size.

<Configurator name="NuiBadge" />

## Examples

### Show a number

Pass a number in `count`.

<Example name="badge/Count" />

A number above `max` shows as the limit with a plus, "99+" by default.

### Mark with a dot

Add `dot` and name the dot in `label`.

<Example name="badge/Dot" />

### Pin to a button

Add `floating` to place the badge in the top corner of its parent.

<Example name="badge/Floating" />

A [Button](/en/components/button) needs nothing extra. Give a block of your own the `relative`
class, or the badge lands in the corner of the nearest positioned ancestor. In right-to-left text
the badge sits in the left corner.

## Accessibility

A screen reader reads the badge text or number together with the text around it. It names a dot
by its `label` and skips a dot without one.

## API

<ApiReference name="NuiBadge" />
