# useFieldControl

`useFieldControl(props, options)` links your control to the label, hint and error of a field.
Use it when you write your own control for `NuiField` and forms.

The composable returns `attrs` with `id`, `aria-describedby`, `aria-invalid`, `required` and
`disabled`. Put them on the input element. Wrap the control markup in `NuiFieldFrame`: outside
`NuiField` it renders the label, hint and error on its own.

<Example name="composables/FieldControl" />

## Signature

<SignatureReference :names="['useFieldControl', 'FieldControlProps', 'FieldControlOptions', 'FieldControl', 'useFieldContext', 'FieldContext', 'useControlId', 'useRadioGroup', 'RadioGroupContext', 'useSplitAttrs', 'SplitAttrs']" />

## Behaviour

`props` is a getter that returns the control's `id`, `invalid`, `required`, `disabled`,
`label`, `description` and `error`. The options:

- `commit` — a function that saves an unfinished value before the form is submitted, for example
  a partly typed date;
- `group` — the control consists of several elements, like a radio group;
- `detached` — the control is not linked to an outer `NuiField`.

Helpers:

- `useFieldContext()` returns the field the control sits in;
- `useControlId()` gives an id that matches on the server and in the browser;
- `useRadioGroup()` returns the group a radio button belongs to;
- `useSplitAttrs()` splits `$attrs` into attributes for the root element and the input.
