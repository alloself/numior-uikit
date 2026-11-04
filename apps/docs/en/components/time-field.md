# Time field

`NuiTimeField` is a field for entering time: hours and minutes, and seconds when needed. The
time can be typed on the keyboard or picked on the wheels that the clock button opens.

<Example name="time-field/Basic" />

The model value is a string like `09:30` without a time zone. The order of the parts, the
separator and the hour format (24-hour or 12-hour with AM/PM) follow the app locale. The `locale`
prop sets another one.

## Installation

```ts
import { NuiTimeField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/time-field.css';
```

## Examples

### Time in different languages

The same value is shown in three locales: `ru-RU` with the 24-hour format, `en-US` with AM/PM
and `ar-EG` with Arabic digits. The `hourCycle` prop sets the hour format regardless of the
language.

<Example name="time-field/Locales" />

### Seconds

The `seconds` prop adds seconds, and the value takes the form `09:30:15`. The minute wheel uses
a 15-minute step by default, and `:step="1"` shows every minute on it.

<Example name="time-field/Seconds" />

## Behaviour

Digits are typed part by part: when the hours or minutes cannot take another digit, the cursor
moves on by itself. While any part is empty, the model value is `null`.

A time before `min` or after `max` is replaced with the nearest limit when the user leaves the
field. On the wheels such times are dimmed.

## Accessibility

Each part of the time is an `<input role="spinbutton">` with `aria-valuenow` and
`aria-valuetext`, and the part names ("hour", "minute") come from `Intl.DisplayNames`. Tab stops
on one part only, and the left and right arrows move between the parts.

The parts run left to right even in right-to-left text. The wheels are a `role="group"`, and
each wheel column is a `role="spinbutton"`.

<KeyboardReference name="NuiTimeField" />

## API

<ApiReference name="NuiTimeField" />
