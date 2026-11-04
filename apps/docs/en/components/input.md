# Input

`NuiInput` is a single-line text field for a name, an email, a phone number or a search. It
renders its label, hint and error from `label`, `description` and `error`.

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

The `prefix` and `suffix` slots put text or an icon inside the frame around the value. Examples are
`@` before a login or `.com` after a domain. They are not part of the field value.

<Example name="input/Affixes" />

### Mask

The `mask` prop formats the text while typing: `#` is a digit, `A` a letter, `*` a letter or a
digit. The field inserts the other mask characters, such as the brackets and dashes in
`+1 (###) ###-####`, by itself. With `v-model.unmasked` the model gets only the typed characters.

<Example name="input/Mask" />

### Lazy update

With `v-model.lazy` the value reaches the model when the user leaves the field or presses Enter,
not on every keystroke. `.trim` removes spaces at the start and the end.

<Example name="input/Lazy" />

### States

With `readonly` the text cannot be changed but can be selected and copied, while `disabled` turns
the field off completely. `error` highlights the frame and shows the error text under the field.

<Example name="input/States" />

## Accessibility

The `placeholder`, `name`, `autocomplete`, `inputmode` attributes and event handlers go to the
`<input>` itself, while `class` and `style` go to the frame around it. Screen readers read the
label, the hint and the error together with the field.

## API

<ApiReference name="NuiInput" />
