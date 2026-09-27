# Alert

`NuiAlert` is a static message inside the page: `variant` sets the look, `tone` the role and the
icon. With `tone="error"` the element gets `role="alert"`, the others read as plain text.

<Example name="alert/Basic" />

## Installation

```ts
import { NuiAlert } from '@numior/vue';
import '@numior/vue/styles/alert.css';
```

## Usage

<Configurator name="NuiAlert" />

## Examples

### A dismissible alert with an action

`dismissible` adds a close button: it sets `v-model:open` to `false` and emits `dismiss`. A
closed alert stays in the DOM; remove it with `v-if` when needed.

<Example name="alert/Dismissible" />

## Accessibility

The icon is decorative, the role of the message comes from `tone`. Buttons inside a soft alert
take `outline` or `solid`: a `soft` button of the same tone blends into the background.

## API

<ApiReference name="NuiAlert" />
