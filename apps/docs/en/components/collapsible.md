# Collapsible

`NuiCollapsible` is a section that expands when its heading is clicked: delivery terms, order
details, advanced settings. Several such sections in a row make up an
[Accordion](/en/components/accordion).

<Example name="collapsible/Basic" />

## Installation

```ts
import { NuiCollapsible } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
```

## Usage

Pass the heading text in `label` and the content in the slot. The `variant="card"` prop draws the
section as a card with a border.

<Configurator name="NuiCollapsible" />

## Examples

### A custom heading

The `trigger` slot replaces the heading text and receives `open`, so the label can change:
"Show details" and "Hide details". With `v-model:open` the section opens and closes from code.

<Example name="collapsible/Trigger" />

## Behaviour

The content expands and collapses smoothly. Collapsed text stays on the page: when the browser's
Ctrl+F search finds it, the section expands by itself.

The `headingLevel` prop wraps the heading in an `<h2>`–`<h6>`, so the section appears in the page
outline.

## Accessibility

The heading is a button, and a screen reader announces whether the section is expanded or
collapsed. With `disabled` the button is turned off and the section cannot be toggled.

<KeyboardReference name="NuiCollapsible" />

## API

<ApiReference name="NuiCollapsible" />
