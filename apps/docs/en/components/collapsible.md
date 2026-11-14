# Collapsible

A section that opens when you click its heading.

<Example name="collapsible/Basic" />

To stack several sections, use an [Accordion](/en/components/accordion).

## Installation

```ts
import { NuiCollapsible } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
```

## Usage

Change the look and the heading, or turn the section off.

<Configurator name="NuiCollapsible" />

## Examples

### Change the heading label

Describe the heading in the `trigger` slot.

<Example name="collapsible/Trigger" />

Bind `v-model:open` to open and close the section from code.

## Behavior

When the browser's Ctrl+F search finds text in a closed section, the section opens by itself.

## Accessibility

The heading is a button, and a screen reader says whether the section is open. A section with
`disabled` cannot be opened or closed.

<KeyboardReference name="NuiCollapsible" />

## API

<ApiReference name="NuiCollapsible" />
