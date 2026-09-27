# Textarea

`NuiTextarea` is a native `<textarea>` for multi-line text. The value goes through `v-model`
with the `.lazy` and `.trim` modifiers.

<Example name="textarea/Basic" />

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

`resize` lets the field grow vertically, in both directions, or not at all.

<Example name="textarea/Resize" />

### Lazy updates

`v-model.lazy` writes to the model on blur, `.trim` strips the spaces around the text.

<Example name="textarea/Lazy" />

## Accessibility

Attributes, classes and event handlers land directly on the `<textarea>`. The label is linked
through `for`, the description and the error through `aria-describedby`.

## API

<ApiReference name="NuiTextarea" />
