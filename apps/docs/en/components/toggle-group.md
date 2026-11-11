# Toggle group

`NuiToggleGroup` is a row of buttons where one or several are pressed. Use it to pick a view
(list or grid), a color theme or the panels that are shown.

<Example name="toggle-group/Basic" />

The buttons are set in `items`, and the pressed one comes through `v-model`. The `required` prop
keeps the last pressed button from being released, so the value never becomes empty. The
`segmented` variant puts the buttons on one shared background, the default `outline` variant
outlines each of them.

## Installation

```ts
import { NuiToggleGroup } from '@numior/vue';
import '@numior/vue/styles/toggle-group.css';
```

## Usage

Change the look, size and direction of the group or keep only the icons on the buttons.

<Configurator name="NuiToggleGroup" />

## Examples

### Several pressed buttons

With `multiple` several buttons can be pressed, and their values come as an array through
`v-model:values`. The `icon-only` prop leaves only icons on the buttons, and the label shows in a
tooltip and names the button. A button with `disabled` in `items` cannot be pressed.

<Example name="toggle-group/Multiple" />

## Accessibility

Without `multiple` the group behaves like a set of radio buttons: the root is a
`role="radiogroup"` and the buttons are `role="radio"` with `aria-checked`. With `multiple` the
root is a `role="group"`, and the buttons get `aria-pressed`. The `label` prop names the group.

Tab stops on one button of the group, and the arrows move between the rest. In a vertical group
these are the up and down arrows, and in right-to-left text the left and right arrows swap.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
