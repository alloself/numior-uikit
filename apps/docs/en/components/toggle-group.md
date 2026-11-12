# Toggle group

A row of buttons where one or several stay pressed.

<Example name="toggle-group/Basic" />

Describe the buttons in `items`, and `v-model` gets the value of the pressed one.

## Installation

```ts
import { NuiToggleGroup } from '@numior/vue';
import '@numior/vue/styles/toggle-group.css';
```

## Usage

Change the style and the size of the group, stack the buttons in a column or leave only their
icons.

<Configurator name="NuiToggleGroup" />

## Examples

### Press several buttons

Add `multiple`.

<Example name="toggle-group/Multiple" />

The pressed values come to `v-model:values` as an array, and the user can release every button:
`required` works only for a single value.

## Accessibility

| Mode            | Group        | Buttons                     |
| --------------- | ------------ | --------------------------- |
| One value       | `radiogroup` | `radio` with `aria-checked` |
| With `multiple` | `group`      | Buttons with `aria-pressed` |

Name the group in `label`. Tab stops on the pressed button, and the arrow keys move between the
others; in right-to-left text the left and right arrows swap.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
