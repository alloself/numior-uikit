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

The root is a `role="group"` named by `label`. In the single mode the buttons carry
`role="radio"` and `aria-checked`, in `multiple` `aria-pressed`. One button stays in the tab
order, the arrows walk the rest and follow `orientation` and RTL.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
