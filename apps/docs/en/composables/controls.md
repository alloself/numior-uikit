# useControls

`useControls()` returns the set of controls that JSON-described forms and table cell editors
pick a control from by name, for example `text` or `date`. The ready-made set of Numior UI
controls is `kitControls` from `@numior/kit/controls`.

Build your own set with `defineControls`. The entry `text: control(NuiInput, isString)` means:
the name `text` renders `NuiInput`, and its value is a string. Pass the set to
`createNuiConfig({ controls })` or to `provideControls`.

<Example name="composables/Controls" />

## Signature

<SignatureReference :names="['useControls', 'provideControls', 'defineControls', 'control', 'controlProps', 'NuiControlEntry', 'NuiControlRegistry', 'ControlProps', 'ControlValue']" />

## Behaviour

`control(component, accepts, { model, props })` checks at the type level that the component
value fits the `accepts` check. `model` is the name of the component model, `modelValue` by
default.

`props` checks the props that a form or table passes to the control. `controlProps(shape)` builds
a strict check: a prop with an unknown name or a value of the wrong type fails. Without `props`
the control accepts any props.

When no set is passed in the settings or through `provideControls`, `useControls()` returns
`null`.
