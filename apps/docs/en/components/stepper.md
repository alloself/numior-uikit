# Stepper

The steps of a process and where the user is in it.

<Example name="stepper/Basic" />

Pass the steps in `steps`, and `v-model` holds the `value` of the current one. The stepper checks
nothing itself: your app or a [Smart form](/en/components/smart-form) decides when to move on.

## Installation

```ts
import { NuiStepper } from '@numior/vue';
import '@numior/vue/styles/stepper.css';
```

## Usage

Line the steps up in a column and let the user open any step of the order.

<Configurator name="NuiStepper" />

## Examples

### Show step statuses in a column

Add `status` and `description` to the steps.

<Example name="stepper/Vertical" />

Steps before the current one count as complete and the ones after it as upcoming, until `status`
sets another state such as `error`.

## Behavior

By default the user goes back only to the steps before the current one, and later steps are plain
text. With `:linear="false"` every step except disabled ones opens. In a narrow container a
horizontal stepper hides the labels and shows the current step with "Step 2 of 4" instead.

## Accessibility

The stepper is a `nav` landmark with an ordered list, and the current step carries
`aria-current="step"`. A screen reader reads the status with the name, such as "Cart, completed".

Steps the user can open and the current step are buttons, so Tab reaches them one by one.

<KeyboardReference name="NuiStepper" />

## API

<ApiReference name="NuiStepper" />
