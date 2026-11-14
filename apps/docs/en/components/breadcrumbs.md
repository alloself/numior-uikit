# Breadcrumbs

The path from the home page to the current one.

<Example name="breadcrumbs/Basic" />

Describe the steps in `items`:

- `label` is the text of the step.
- `href` or `to` is its address, and a step with `to` renders through the router of your app.
- `icon` puts an icon before the text.

The last step names the current page and does not link anywhere.

## Installation

```ts
import { NuiBreadcrumbs } from '@numior/vue';
import '@numior/vue/styles/link.css';
import '@numior/vue/styles/breadcrumbs.css';
```

## Usage

Collapse a long path to the number of steps you need and pick the icon between the steps.

<Configurator name="NuiBreadcrumbs" />

## Examples

### Collapse a long path

Set `maxItems`.

<Example name="breadcrumbs/Collapsed" />

The first and the last steps stay in view, and the middle ones move into a “…” menu with the same
links.

### Replace the markup of a step

Describe the step in the `item` slot.

<Example name="breadcrumbs/Custom" />

The slot receives `item`, `index` and `current`, and the separators and the “…” menu stay in
place. Mark the current step with `aria-current="page"` in your markup.

## Behavior

In right-to-left text the icon between the steps is mirrored, and `separator` puts another icon in
its place.

## Accessibility

The path is a `nav` landmark named by `label`, "Breadcrumb" by default. The current page carries
`aria-current="page"` and does not link to itself. Links are at least 24 pixels tall, as WCAG
2.5.8 asks.

<KeyboardReference name="NuiBreadcrumbs" />

## API

<ApiReference name="NuiBreadcrumbs" />
