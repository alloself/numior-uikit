# Accordion

`NuiAccordion` is a list of sections that expand on click, such as questions and answers. One
section is open at a time by default; with the `multiple` prop any number can be open.

<Example name="accordion/Basic" />

## Installation

```ts
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
import '@numior/vue/styles/accordion.css';
```

## Examples

### Several sections

Add `multiple`, and `v-model:values` holds the list of open sections. The `variant="card"` prop
draws every section as a separate card, and `disabled` on a `NuiAccordionItem` turns the section
off.

<Example name="accordion/Multiple" />

## Behaviour

Without `multiple`, `v-model` holds the `value` of the open section, or `null` when all are
collapsed. With `:collapsible="false"` the open section cannot be collapsed by a second click: it
closes only when another one opens.

The `headingLevel` prop wraps every section heading in an `<h2>`–`<h6>`, so the sections appear in
the page outline. A section works the same way as a [Collapsible](/en/components/collapsible).

## Accessibility

Section headings are buttons with `aria-expanded`. The up and down arrows move between them and
wrap around; Home and End jump to the first and the last section.

<KeyboardReference name="NuiAccordion" />

## API

<ApiReference :names="['NuiAccordion', 'NuiAccordionItem']" />
