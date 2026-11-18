# Accordion

Sections stacked under each other, with one or several open at a time.

<Example name="accordion/Basic" />

## Installation

```ts
import { NuiAccordion, NuiAccordionItem } from '@numior/kit';
```

## Usage

Change the look and open one section at a time or several at once.

<Configurator name="NuiAccordion" />

## Examples

### Open several sections

Add `multiple` and keep the open sections in `v-model:values`.

<Example name="accordion/Multiple" />

## Behavior

Without `multiple`, `v-model` holds the `value` of the open section, or `null` when all are
closed. With `:collapsible="false"`, a second click leaves the open section open: it closes only
when another one opens.

## Accessibility

Section headings are buttons, and a screen reader says whether a section is open. The up and
down arrows move between headings and wrap around; Home and End jump to the first and the last.
The keys work only on a heading: in a field inside a section they move the caret as usual.

<KeyboardReference name="NuiAccordion" />

## API

<ApiReference :names="['NuiAccordion', 'NuiAccordionItem']" />
