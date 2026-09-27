# Time field

`NuiTimeField` edits time as a set of segments: hours, minutes, optionally seconds and AM/PM.
The segment order, separators and cycle come from the locale, and the model stays an `HH:mm`
string without a time zone. The clock button opens the wheels.

<Example name="time-field/Basic" />

## Installation

```ts
import { NuiTimeField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/time-field.css';
```

## Examples

### Locales

One value, three locales: a 24-hour cycle, a 12-hour one with a period, and Arabic digits.
`hourCycle` forces the cycle.

<Example name="time-field/Locales" />

### Seconds

`seconds` adds a seconds segment and the model becomes `HH:mm:ss`; a `step` of one minute
gives the wheels every value.

<Example name="time-field/Seconds" />

## Behaviour

Digits are typed per segment: a segment fills and moves on as soon as the next digit cannot
continue the number. The model stays `null` while a segment is empty, and a full value outside
`min` and `max` is clamped on blur. The wheels show the minutes in `step` increments and dim
the unavailable values.

## Accessibility

The segments are native `<input role="spinbutton">` elements with `aria-valuenow` and
`aria-valuetext`, labelled through `Intl.DisplayNames`. One segment stays in the tab order, and
the row of segments runs left to right even in RTL. The wheels are a `role="group"`, every
column a `role="spinbutton"`.

<KeyboardReference name="NuiTimeField" />

## API

<ApiReference name="NuiTimeField" />
