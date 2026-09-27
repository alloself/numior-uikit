# Input

`NuiInput` is a native `<input>` in a frame with a focus ring and the `prefix` and `suffix`
slots. The value goes through `v-model` with the `.lazy`, `.trim` and `.unmasked` modifiers.

<Example name="input/Basic" />

## Installation

```ts
import { NuiInput } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/input.css';
```

## Usage

<Configurator name="NuiInput" />

## Examples

### Prefix and suffix

The slots sit inside the frame at the edges of the field and stay out of the value.

<Example name="input/Affixes" />

### Mask

`mask` formats the input as you type: `#` is a digit, `A` a letter, `*` a letter or digit, the
other characters are inserted on their own. `v-model.unmasked` keeps only the meaningful
characters in the model.

<Example name="input/Mask" />

### Lazy updates

`v-model.lazy` writes to the model on blur or Enter, `.trim` strips the spaces around the text.

<Example name="input/Lazy" />

### States

`readonly` keeps the text selectable, `disabled` switches the field off, `error` turns the
error state on and shows the text under the field.

<Example name="input/States" />

## Accessibility

The field stays a native `<input>`: `placeholder`, `name`, `autocomplete`, `inputmode` and
event handlers land on it, `class` and `style` on the frame. The label is linked through
`for`, the description and the error through `aria-describedby`.

## API

<ApiReference name="NuiInput" />
