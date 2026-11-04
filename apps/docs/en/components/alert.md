# Alert

`NuiAlert` is a message on the page: a draft was saved, a project was published, the network is
down. Pop-up notifications are shown by a [Toast](/en/components/toast).

<Example name="alert/Basic" />

## Installation

```ts
import { NuiAlert } from '@numior/vue';
import '@numior/vue/styles/alert.css';
```

## Usage

The `tone` prop sets the colour and the icon: `info` (the default), `success`, `warning`, `error`
and others. `variant` picks the fill: `soft`, `outline` or `solid`.

<Configurator name="NuiAlert" />

## Examples

### A dismissible alert with an action

Add `dismissible` to show a close button in the corner. Pressing it hides the alert, sets
`v-model:open` to `false` and emits the `dismiss` event.

<Example name="alert/Dismissible" />

Action buttons go into the `actions` slot. Inside a `soft` alert use `outline` or `solid`
buttons: a `soft` button of the same tone blends into the background.

## Accessibility

An alert with `tone="error"` gets `role="alert"`, so a screen reader announces it as soon as it
appears. Other alerts read as regular page text, and their icon is decorative.

## API

<ApiReference name="NuiAlert" />
