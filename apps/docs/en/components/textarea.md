# Textarea

A field for text that takes several lines.

<Example name="textarea/Basic" />

Set the height in lines with `rows`.

## Installation

```ts
import { NuiTextarea } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/textarea.css';
```

## Usage

Change the number of rows and the states of the field.

<Configurator name="NuiTextarea" />

## Examples

### Let the user resize the field

Pick the direction in `resize`.

<Example name="textarea/Resize" />

By default only the height changes, and `none` fixes the size.

### Update the model after typing

Add the `.lazy` modifier.

<Example name="textarea/Lazy" />

The text reaches the model when the user leaves the field, and `.trim` drops the spaces at both
ends.

## Accessibility

The field is a native `<textarea>`, and attributes and event handlers go straight to it. A screen
reader reads the label, the hint and the error together with the field.

## API

<ApiReference name="NuiTextarea" />
