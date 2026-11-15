# Combobox

A field with a list that narrows as you type.

<Example name="combobox/Basic" />

Pass the options to `options`, as for a [Select](/en/components/select). The list keeps the
options whose label contains the typed text, in any letter case.

## Installation

```ts install
import { NuiCombobox } from '@numior/vue';
```

## Usage

Change the size and the states of the field, then find a customer by name.

<Configurator name="NuiCombobox" />

The search ignores case, Latin accents and the difference between the Russian «е» and «ё». Your
own function in `filter` gets the text in lower case only and compares on its own.

## Examples

### Pick several values

Add `multiple`.

<Example name="combobox/Multiple" />

The picked values show as chips in the field. Pass `customValue` to turn typed text into a new
value when the user presses Enter and no option is highlighted.

### Search on the server

Turn off the filter and handle the `search` event.

<Example name="combobox/Async" />

Keep `loading` on while the request runs, and ignore answers that arrive for an older query.

### Show more data in an option

Describe the row in the `option` slot.

<Example name="combobox/Option" />

## Accessibility

The focus stays in the field while the arrow keys move through the options, and a screen reader
reads the highlighted one. Tab skips the clear, list and chip remove buttons: Backspace in an empty
field removes the last chip.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
