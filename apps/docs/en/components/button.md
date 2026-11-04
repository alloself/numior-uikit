# Button

`NuiButton` is a button for actions: save a form, open a dialog, delete a record. For a link
inside text use a [Link](/en/components/link).

<Example name="button/Basic" />

## Installation

```ts
import { NuiButton } from '@numior/vue';
import '@numior/vue/styles/button.css';
```

## Usage

The `variant` prop sets the look of the button: `solid` (the default), `soft`, `outline`,
`ghost`, `plain` or `link`. The `tone` prop sets the colour: `primary`, `success`, `error`,
`neutral` and others.

<Configurator name="NuiButton" />

## Examples

### Sizes

The `size` prop accepts `xs`, `sm`, `md` and `lg`, with `md` by default. The `inline` size
follows the surrounding font and suits a button inside a line of text. In the compact density
every size gets shorter.

<Example name="button/Sizes" />

### States

`disabled` turns the button off. The `loading` prop shows a spinner and blocks presses, while
the button keeps its width and its focus.

<Example name="button/States" />

### With an icon

The `icon` prop puts an icon before the text, and `iconEnd` after it. An icon can also go into
the slot along with the text.

<Example name="button/WithIcon" />

### Icon only

A button with a single icon and no text becomes square. Label it with `aria-label`, otherwise a
screen reader has no name to announce.

<Example name="button/IconOnly" />

The `plain` variant suits buttons inside a field: open the list, clear, show the password. It has
no background, and the muted icon darkens on hover.

### Link

Pass `href` or `to` to turn the button into a link with the same look. With `to` the button
becomes the app's `RouterLink` or `NuxtLink`, and the `as` prop puts another component in its
place.

<Example name="button/Link" />

## Accessibility

A button stays a native `<button>` and a link an `<a>`, so the keyboard and screen readers handle
them as usual. While loading, the button gets `aria-busy` and stays in the tab order.

<KeyboardReference name="NuiButton" />

## API

<ApiReference name="NuiButton" />
