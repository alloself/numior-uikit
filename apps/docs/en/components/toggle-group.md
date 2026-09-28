# Toggle group

`NuiToggleGroup` is a row of buttons with one pressed value or several. The single mode writes
to `v-model`, `multiple` to `v-model:values`; `required` forbids releasing the last button.

<Example name="toggle-group/Basic" />

## Installation

```ts
import { NuiToggleGroup } from '@numior/vue';
import '@numior/vue/styles/toggle-group.css';
```

## Examples

### Several pressed

`multiple` with `icon-only`: the labels become the accessible names of the buttons, and
`disabled` on an item disables one button.

<Example name="toggle-group/Multiple" />

## Accessibility

In the single mode the root is a `role="radiogroup"` with `role="radio"` buttons and
`aria-checked`. In `multiple` it is a `role="group"` with `aria-pressed`; `label` names it. One button stays in the tab
order, the arrows walk the rest and follow `orientation` and RTL.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
