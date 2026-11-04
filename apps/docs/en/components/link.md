# Link

`NuiLink` is a link in text: to another page of the app, to a document or to an external site.
Pass an address in `href` and an app route in `to`.

<Example name="link/Basic" />

With `to` the link renders through the `RouterLink` or `NuxtLink` of your app, and the `as` prop
swaps in any other component. `tone` sets the color, `primary` by default.

## Link or Button

`NuiLink` fits a link inside a paragraph: it wraps across lines with the text, takes its font size
and adds no padding. For an action in a row of buttons use `NuiButton` with `variant="link"`: it
has the button height and a loading state.

<Example name="link/VersusButton" />

## Installation

```ts
import { NuiLink } from '@numior/vue';
import '@numior/vue/styles/link.css';
```

## Usage

<Configurator name="NuiLink" />

## Examples

### External links

With `external` the link opens in a new tab and shows an external link icon after the text. The
opened page gets no access to your tab and does not learn where the visit came from.

<Example name="link/External" />

### Underline and disabled state

The `underline` prop picks when the link is underlined: `always` (the default), `hover` only on
hover, `none` never. `disabled` turns off navigation, and Tab skips such a link.

<Example name="link/States" />

## Accessibility

The link stays a regular `<a>` element. Users open it in a new tab, copy it and follow it from the
keyboard like any other link. Screen readers still read a disabled link and report it as
unavailable.

<KeyboardReference name="NuiLink" />

## API

<ApiReference name="NuiLink" />
