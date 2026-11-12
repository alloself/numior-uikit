# Progress

A bar that shows how far a task has come.

<Example name="progress/Basic" />

Pass the work done to `value` and the total to `max`; without `value` the bar shows that the end
is not known yet.

## Installation

```ts
import { NuiProgress } from '@numior/vue';
import '@numior/vue/styles/progress.css';
```

## Usage

Change the value, the thickness and the tone of the bar.

<Configurator name="NuiProgress" />

## Examples

### Update the value as the work goes

Change `value` after each step, and the bar slides to the new length.

<Example name="progress/Live" />

Pass the status line to `valueText` too, so a screen reader reads the product count in place of a
percentage.

## Accessibility

The bar is a native `<progress>`, and a screen reader announces it with its value. Name it with
`label`, since the bar has no visible text of its own. With reduced motion turned on in the
system, a bar without `value` moves twice as slowly.

## API

<ApiReference name="NuiProgress" />
