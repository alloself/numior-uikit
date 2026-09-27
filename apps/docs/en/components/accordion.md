# Accordion

`NuiAccordion` gathers `NuiAccordionItem` sections into one list: one section is open by
default (`v-model`), several with `multiple` (`v-model:values`). Every section is the same
[Collapsible](/en/components/collapsible).

<Example name="accordion/Basic" />

## Installation

```ts
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
import '@numior/vue/styles/accordion.css';
```

## Examples

### Several sections

`multiple` keeps several sections open, `variant="card"` draws them as cards, and `disabled`
on a section closes it to clicks.

<Example name="accordion/Multiple" />

## Behaviour

`collapsible="false"` prevents closing the only open section by a click: one section is
always open. `headingLevel` sets the heading level of every section at once.

## Accessibility

The section headings are buttons with `aria-expanded`; the arrows walk between them with
wraparound, Home and End go to the first and the last.

<KeyboardReference name="NuiAccordion" />

## API

<ApiReference :names="['NuiAccordion', 'NuiAccordionItem']" />
