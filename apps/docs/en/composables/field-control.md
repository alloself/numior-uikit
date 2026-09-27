# useFieldControl

`useFieldControl(props, options)` connects an own control to a field. It returns `attrs` with
`id`, `aria-describedby`, `aria-invalid`, `required` and `disabled`, linked to the label,
description and error of the nearest `NuiField`. Without an outer field the control draws
the texts itself through `NuiFieldFrame`.

<Example name="composables/FieldControl" />

## Signature

<SignatureReference :names="['useFieldControl', 'FieldControlProps', 'FieldControlOptions', 'FieldControl', 'useFieldContext', 'FieldContext', 'useControlId', 'useRadioGroup', 'RadioGroupContext', 'useSplitAttrs', 'SplitAttrs']" />

## Behaviour

`props` is a getter with `id`, `invalid`, `required`, `disabled`, `label`, `description` and
`error`. `options.commit` confirms a draft before a form submit, `options.group` declares a
group control, `options.detached` cuts the link to an outer field. `useFieldContext` reads
the field context directly, `useControlId` gives an SSR-stable id, `useRadioGroup` the radio
group context, `useSplitAttrs` splits `$attrs` into root and control attributes.
