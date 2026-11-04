# Stepper

`NuiStepper` shows which step of a process the user is on: sign-up, checkout, project setup.
Completed steps carry a check mark, a step with an error a cross, and the rest a number.

<Example name="stepper/Basic" />

Steps go into `steps`, and the current one lives in `v-model` by its `value`. The stepper
validates nothing by itself: the app or a [Smart form](/en/components/smart-form) decides when
to move on.

## Installation

```ts
import { NuiStepper } from '@numior/vue';
import '@numior/vue/styles/stepper.css';
```

## Examples

### A column with statuses

`orientation="vertical"` lines the steps up in a column. Steps before the current one count as
complete, and the ones after as upcoming. The `status` of a step sets it by hand, such as
`error`.

<Example name="stepper/Vertical" />

## Behaviour

By default the user can go back only to completed steps: they are buttons, and future steps are
plain text. With `:linear="false"` any step except `disabled` ones can be opened.

In a narrow container a horizontal stepper hides the labels and shows the current step name and
"Step 2 of 4" under the circles. Numbers use the digits of the locale, and in right-to-left text
the steps run from right to left.

## Accessibility

The stepper is a `<nav>` landmark with an ordered list, and the current step carries
`aria-current="step"`. A screen reader reads the status with the name: "Profile, completed".

Step buttons are reached with Tab one after another.

<KeyboardReference name="NuiStepper" />

## API

<ApiReference name="NuiStepper" />
