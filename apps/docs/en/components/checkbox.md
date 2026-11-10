# Checkbox

`NuiCheckbox` is a checkbox for a consent or a setting that turns on and off. To pick several
options from a list use `NuiCheckboxGroup`.

<Example name="checkbox/Basic" />

## Installation

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/checkbox.css';
```

## Usage

Pass the checkbox text in the slot or in `label`, and a hint under it in `description`.
`v-model` holds `true` or `false`.

<Configurator name="NuiCheckbox" />

## Examples

### A set of values

`NuiCheckboxGroup` renders a checkbox for every option in `options`. `v-model:values` holds an array of
the selected values in the order they were checked.

<Example name="checkbox/Group" />

An option with `disabled: true` cannot be checked or unchecked, but stays in the array if it is
already selected.

### In a row

With `orientation="horizontal"` the checkboxes line up in a row and wrap when they do not fit.

<Example name="checkbox/Horizontal" />

### Partial selection

The `indeterminate` prop shows a dash instead of a check mark. This is how an "All regions"
checkbox tells that only part of the list is selected. A click removes the dash and toggles the
checkbox as usual.

<Example name="checkbox/Indeterminate" />

## Accessibility

A native `<input type="checkbox">` sits under the styling, so the keyboard and screen readers
handle it as usual. The group renders as a `<fieldset>`, and its `label` as a `<legend>`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
