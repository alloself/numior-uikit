# Collapsible

`NuiCollapsible` hides content behind a heading button. The state lives in `v-model:open`,
the height animates through the motion tokens, and the hidden text stays in the DOM where
find-in-page reaches it.

<Example name="collapsible/Basic" />

## Installation

```ts
import { NuiCollapsible } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
```

## Usage

<Configurator name="NuiCollapsible" />

## Examples

### Own heading

The `trigger` slot receives `open` and changes the button text; `v-model:open` opens the
content from outside.

<Example name="collapsible/Trigger" />

## Behaviour

Closed content is marked `hidden="until-found"`: the browser's find-in-page expands the
section on its own. `headingLevel` wraps the button in an `h2`–`h6` so the section joins the
document outline.

## Accessibility

The button carries `aria-expanded` and `aria-controls` of the content; `disabled` disables it
natively.

<KeyboardReference name="NuiCollapsible" />

## API

<ApiReference name="NuiCollapsible" />
