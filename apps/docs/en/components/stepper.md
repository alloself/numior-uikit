# Stepper

`NuiStepper` shows the steps of a process as a `<nav>` with an ordered list. Completed steps
carry a check mark, a step with errors a cross, the rest a number. Steps validate nothing on
their own: the app or `NuiSmartForm` drives the transitions.

<Example name="stepper/Basic" />

## Installation

```ts
import { NuiStepper } from '@numior/vue';
import '@numior/vue/styles/stepper.css';
```

## Examples

### A column with statuses

The status follows the position: steps before the current one are complete, later ones
upcoming; an explicit `status` wins. `:linear="false"` turns every step except `disabled` ones
into a button.

<Example name="stepper/Vertical" />

## Behaviour

In linear mode the completed steps and the current one become buttons, future steps stay text.
A narrow horizontal stepper hides the labels and shows the current step name and "Step 2 of 4"
under the indicators. Numbers follow the locale, in RTL the row is mirrored.

## Accessibility

The `<nav aria-label>` landmark and the list give the structure; the current step carries
`aria-current="step"`. The status is read from hidden text in the step name ("Profile,
complete"). Step buttons are reached with Tab, without roving focus.

<KeyboardReference name="NuiStepper" />

## API

<ApiReference name="NuiStepper" />
