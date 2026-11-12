# Checkbox

A checkbox for a consent or a setting.

<Example name="checkbox/Basic" />

Pass the text in the default slot or in `label`. The hint and the error work as on the
[Field](/en/components/field) page.

## Installation

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/checkbox.css';
```

## Usage

Change the size and the states of the checkbox.

<Configurator name="NuiCheckbox" />

## Examples

### Pick several options

Pass the options to the group in `options`.

<Example name="checkbox/Group" />

An option with `disabled: true` cannot be changed, and a checked one stays in the model.

### Line the checkboxes up in a row

Set `orientation="horizontal"`.

<Example name="checkbox/Horizontal" />

### Check part of a list

Turn on `indeterminate` when only some items are checked.

<Example name="checkbox/Indeterminate" />

## Accessibility

The checkbox is a native `<input type="checkbox">`, so the keyboard and screen readers handle it
as usual. The group is a `<fieldset>`, and its label is the `<legend>`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
