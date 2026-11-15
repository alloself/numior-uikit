# Time field

A field for the time of day.

<Example name="time-field/Basic" />

The value is a string such as `09:30`, with no time zone. The hour format and the order of the
parts follow the app language.

## Installation

```ts install
import { NuiTimeField } from '@numior/vue';
```

## Usage

Add seconds and change the hour format, the minute step and the states of the field.

<Configurator name="NuiTimeField" />

## Examples

### Show the time in another language

Set `locale`.

<Example name="time-field/Locales" />

### Add seconds

Add `seconds`.

<Example name="time-field/Seconds" />

## Behavior

Digits fill the parts one by one, and the caret moves to the next part once the current one is
full. While any part is empty, the model is `null`.

A time before `min` or after `max` turns into the nearest limit when the focus leaves the field.

## Accessibility

A screen reader names each part of the time, such as "hour" or "minute". Tab stops on one part
only, and the left and right arrows move between the parts. The parts run left to right in
right-to-left text too.

<KeyboardReference name="NuiTimeField" />

## API

<ApiReference name="NuiTimeField" />
