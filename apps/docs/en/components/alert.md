# Alert

A message inside the page content.

<Example name="alert/Basic" />

For a short notice that appears over the page and goes away by itself, use a
[Toast](/en/components/toast).

## Installation

```ts
import { NuiAlert } from '@numior/vue';
import '@numior/vue/styles/alert.css';
```

## Usage

Change the tone, the look and the title of the message.

<Configurator name="NuiAlert" />

## Examples

### Let the user close the message and act on it

Add `dismissible` and put the buttons into the `actions` slot.

<Example name="alert/Dismissible" />

To show a closed message again, set `v-model:open` back to `true`. Inside a `soft` alert, use
`solid` or `outline` buttons: a `soft` button of the same tone blends into the background.

## Accessibility

An `error` alert gets `role="alert"`, so a screen reader announces it as soon as it appears. Other
alerts read as regular page text, and their icon is hidden from screen readers.

## API

<ApiReference name="NuiAlert" />
