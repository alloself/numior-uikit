# Link

`NuiLink` is a link on the role tokens: an `<a>` by default, the app's `RouterLink` or `NuxtLink`
with `to`, and `as` overrides the component. `tone` sets the colour, `underline` when to
underline, `external` opens the address in a new tab with `rel="noopener noreferrer"` and an icon.

<Example name="link/Basic" />

## Link or Button

`NuiLink` is a link inside text: it wraps across lines with the paragraph, takes its font size
and adds no padding. `NuiButton variant="link"` is an action in a row of buttons: control height,
alignment with the buttons next to it and loading states.

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

`external` adds an icon and opens the address in a new tab.

<Example name="link/External" />

### Underline and disabled links

`underline="hover"` underlines only on hover, `disabled` removes the address and marks the link
`aria-disabled`.

<Example name="link/States" />

## Accessibility

The link stays a native `<a>`. With `to` set, `href` is not rendered, so the router owns the
address; menu items, breadcrumbs and the sidebar use the same contract. `disabled` keeps the
link readable and only removes the navigation and the focus.

<KeyboardReference name="NuiLink" />

## API

<ApiReference name="NuiLink" />
