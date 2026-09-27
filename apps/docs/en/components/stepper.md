# Stepper

`NuiStepper` shows the steps of a flow — signup, checkout, a setup wizard — as a `<nav>` with
an ordered list. `v-model` holds the value of the current step. Completed steps show a check,
a failed step a cross, the rest a number, and the line between steps fills as the flow moves
on. Steps validate nothing themselves: the app or the smart form decides when to move.

<script setup>
import { ref } from 'vue'
const signup = ref('profile')
const settings = ref('access')
const signupSteps = [
  { value: 'account', label: 'Account', description: 'Email and password' },
  { value: 'profile', label: 'Profile', description: 'Name and photo' },
  { value: 'plan', label: 'Plan' },
  { value: 'review', label: 'Review' },
]
const settingsSteps = [
  { value: 'general', label: 'General', description: 'Name and address', status: 'complete' },
  { value: 'access', label: 'Access', description: 'Member roles', status: 'error' },
  { value: 'billing', label: 'Billing', description: 'Card and details' },
  { value: 'danger', label: 'Deletion', description: 'Not available to guests', disabled: true },
]
const move = (delta) => {
  const index = signupSteps.findIndex((step) => step.value === signup.value)
  signup.value = signupSteps[Math.min(Math.max(index + delta, 0), signupSteps.length - 1)].value
}
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiStepper v-model="signup" :steps="signupSteps" label="Signup" />
  <div style="display: flex; justify-content: flex-end; gap: 0.5rem">
    <NuiButton variant="outline" tone="neutral" @click="move(-1)">Back</NuiButton>
    <NuiButton @click="move(1)">Next</NuiButton>
  </div>
  <NuiStepper v-model="settings" :steps="settingsSteps" orientation="vertical" :linear="false" label="Project settings" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/vue';
import '@numior/vue/styles/stepper.css';

const step = ref('profile');

const steps: NuiStepperStep[] = [
  { value: 'account', label: 'Account', description: 'Email and password' },
  { value: 'profile', label: 'Profile', description: 'Name and photo' },
  { value: 'plan', label: 'Plan' },
  { value: 'review', label: 'Review' },
];
</script>

<template>
  <NuiStepper v-model="step" :steps="steps" label="Signup" />
</template>
```

## Behaviour

A step's status follows its position: steps before the current one are `complete`, steps
after it `upcoming`; an explicit `status` (`complete`, `error`, `upcoming`) wins, so a smart
form marks only the steps the user already tried as failed. In linear mode (`linear`, the
default) completed steps and the current one are buttons, so users can go back, while future
steps stay text. `:linear="false"` turns every step except `disabled` ones into a button; a
disabled step is an unavailable button. Clicking the current step changes nothing, but the
button stays in place, so focus is kept when a step the user went back to becomes current.

`orientation="vertical"` stacks the steps with a continuous line between the indicators. A
narrow horizontal stepper (a container below `32rem`) hides the labels visually, keeps the
indicators and lines and shows the current step name and “Step 2 of 4” below them. Numbers
follow the configured locale, and in RTL the row and the line fill mirror.

## Accessibility

The `<nav aria-label>` landmark and the `<ol role="list">` give the structure; the current
step carries `aria-current="step"`. The indicator is hidden from screen readers, and the status
is read from visually hidden text in the step name (“Profile, completed”, “Access, has
errors”). Step buttons are reached with Tab and fire on Enter and Space without roving focus;
in compact mode the labels stay in the accessibility tree.

## API

| Prop            | Type                         | Default                                                    | Description                                          |
| --------------- | ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `v-model`       | `string`                     | —                                                          | Value of the current step                            |
| `steps`         | `NuiStepperStep[]`           | —                                                          | `{ value, label, description?, status?, disabled? }` |
| `orientation`   | `'horizontal' \| 'vertical'` | `'horizontal'`                                             | Direction                                            |
| `linear`        | `boolean`                    | `true`                                                     | Only completed steps become buttons                  |
| `label`         | `string`                     | [dictionary](/en/guide/localization#stepper): “Steps”      | `aria-label` of the nav                              |
| `completeLabel` | `string`                     | [dictionary](/en/guide/localization#stepper): “completed”  | Hidden status of a completed step                    |
| `errorLabel`    | `string`                     | [dictionary](/en/guide/localization#stepper): “has errors” | Hidden status of a failed step                       |

Block `nui-stepper` (modifier `--orientation-*`; elements `__list`, `__item` with `--complete`,
`--upcoming`, `--error`, `--current`, `--clickable`, `--disabled`, `__step`, `__indicator`,
`__mark`, `__status`, `__connector`, `__summary`, `__summary-label`, `__summary-count`). Item
variables: `--_ring`, `--_fill`, `--_ink`, `--_label`, `--_halo`, `--_connector-fill`.
