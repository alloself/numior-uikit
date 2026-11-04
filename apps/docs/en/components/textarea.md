# Textarea

`NuiTextarea` is a field for multi-line text such as a comment, a description or a reply to a
customer. It renders a native `<textarea>` with a label, a hint and an error message.

<Example name="textarea/Basic" />

The value is bound with `v-model`, and `rows` sets the height of the field in lines, 3 by
default.

## Installation

```ts
import { NuiTextarea } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/textarea.css';
```

## Usage

<Configurator name="NuiTextarea" />

## Examples

### Resizing

The `resize` prop controls whether the field can be dragged by its corner. `vertical` resizes
only the height and is the default, `both` resizes in both directions, and `none` turns it off.

<Example name="textarea/Resize" />

### Updating after input

With `v-model.lazy` the value updates when the user leaves the field instead of on every
keystroke. The `.trim` modifier removes spaces at the start and the end of the text.

<Example name="textarea/Lazy" />

## Accessibility

Attributes, classes and event handlers land directly on the `<textarea>`. The label is linked to
the field through `for`, the hint and the error message through `aria-describedby`.

## API

<ApiReference name="NuiTextarea" />
