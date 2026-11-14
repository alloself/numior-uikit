# Link

A link inside text.

<Example name="link/Basic" />

Pass an address in `href` and an app route in `to`. A link with `to` renders through the
`NuxtLink` or `RouterLink` of your app, unless the [configuration](/en/guide/configuration) names
another link component.

## Installation

```ts
import { NuiLink } from '@numior/vue';
import '@numior/vue/styles/link.css';
```

## Usage

Change the underline and the states of the link.

<Configurator name="NuiLink" />

## Examples

### Open in a new tab

Add `external`.

<Example name="link/External" />

The link gets `rel="noopener noreferrer"`, so the opened page has no access to your tab and does
not learn where the visit came from.

### Tell a link from a button

Use Link inside a paragraph and Button with `variant="link"` for an action in a row of buttons.

<Example name="link/VersusButton" />

## Accessibility

The link stays a regular `<a>` element, so users open it in a new tab, copy it and follow it with
Enter. A disabled link loses its address and drops out of the Tab order. A screen reader still
reads it as an unavailable link.

<KeyboardReference name="NuiLink" />

## API

<ApiReference name="NuiLink" />
