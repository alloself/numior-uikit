# Button

A button for actions on the page.

<Example name="button/Basic" />

## Installation

```ts install
import { NuiButton } from '@numior/kit';
```

## Usage

Pick the look, the color and the size of the button.

<Configurator name="NuiButton" />

## Examples

### Show a loading state

Turn on `loading` while a request is running.

<Example name="button/Loading" />

The button keeps its width and its focus, and presses do nothing until loading ends.

### Add an icon

Pass an icon name to `icon` or `iconEnd`.

<Example name="button/WithIcon" />

### Leave only the icon

Name a button that has no text with `aria-label`.

<Example name="button/IconOnly" />

Inside a field, set `variant="plain"`: the button has no background, and its muted icon takes
the text color on hover.

### Fit a button into text

Set `size="inline"`, and the button follows the size of the text around it.

<Example name="button/Inline" />

### Turn a button into a link

Pass `href` or `to`; for a link inside a sentence use [Link](/en/components/link).

<Example name="button/Link" />

## Accessibility

The button is a native `<button>`, and with `href` or `to` a link, so the keyboard and screen
readers treat it as usual. While loading, it gets `aria-busy` and stays reachable with Tab.

<KeyboardReference name="NuiButton" />

## API

<ApiReference name="NuiButton" />
