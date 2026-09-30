# useControls

`defineControls({ text: control(NuiInput, isString, { props }) })` builds a control registry:
the component, its model name, a value guard and a props guard. Forms from JSON and cell
editors find a control by its string key. `createNuiConfig({ controls })` or `provideControls`
hands the registry to descendants, `kitControls` from `@numior/vue/controls` describes the kit controls.

<Example name="composables/Controls" />

## Signature

<SignatureReference :names="['useControls', 'provideControls', 'defineControls', 'control', 'controlProps', 'NuiControlEntry', 'NuiControlRegistry', 'ControlProps', 'ControlValue']" />

## Behaviour

`control(component, accepts, { model, props })` checks at the type level that the component
model fits the `accepts` guard. `controlProps(shape)` builds a strict guard: an unknown key or a
value of another type is rejected. Without `props` an entry accepts any object, and
`useControls()` returns `null` until a registry is provided.
