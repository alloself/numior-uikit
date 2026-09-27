# Skip link

`NuiSkipLink` is the first link of a page, "Skip to content". It stays invisible until it
receives keyboard focus and moves the focus to the `target` element past the header and the
navigation.

<Example name="skip-link/Basic" />

## Installation

```ts
import { NuiSkipLink } from '@numior/vue';
import '@numior/vue/styles/skip-link.css';
```

## Behaviour

A click focuses the target, adding `tabindex="-1"` when needed, and writes `#target` into
the address without a page jump. Place the link as the first element of `body` so it comes
first in the tab order.

## Accessibility

The link always stays in the accessibility tree and the tab order; it is hidden visually
only.

<KeyboardReference name="NuiSkipLink" />

## API

<ApiReference name="NuiSkipLink" />
