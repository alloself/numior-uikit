# Input

A single-line text field.

<Example name="input/Basic" />

The label, the hint and the error work as described on the [Field](/en/components/field) page.

## Installation

```ts
import { NuiInput } from '@numior/kit';
```

## Usage

Change the type, the size and the states of the field.

<Configurator name="NuiInput" />

## Examples

### Add an icon or a unit

Put text or an icon into the `prefix` and `suffix` slots.

<Example name="input/Affixes" />

The slot content stays out of the model.

### Enter a phone number with a mask

Describe the format in `mask`.

<Example name="input/Mask" />

| Mask character | Accepts             |
| -------------- | ------------------- |
| `#`            | A digit             |
| `A`            | A letter            |
| `*`            | A letter or a digit |

The field adds the other mask characters, such as brackets and dashes, as the user types. Add
`.unmasked` to `v-model` to keep only the typed characters in the model.

The mask and the model wait while an input method composes a word, such as CJK input or Android
keyboard suggestions. They update when the composition ends, like `v-model` on a plain `<input>`.

### Update the model after typing

Add the `.lazy` modifier.

<Example name="input/Lazy" />

The value reaches the model when the user leaves the field or presses Enter. Add `.trim` to drop
the spaces at both ends.

## Accessibility

A screen reader reads the label, the hint and the error together with the field. Attributes such
as `autocomplete` and `inputmode` go to the `<input>` itself, and `class` and `style` go to the
frame around it.

## API

<ApiReference name="NuiInput" />
