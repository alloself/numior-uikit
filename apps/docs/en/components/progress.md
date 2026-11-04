# Progress

`NuiProgress` is a progress bar: file uploads, imports, how far a task has come. When the result
cannot be measured in advance, the bar shows that work is going on, without a percentage.

<Example name="progress/Basic" />

`value` is how much is done and `max` how much there is, 100 by default. Without `value` a
segment runs along the bar. `tone` sets the colour, such as `success` or `info`, and `size` the
thickness: `sm`, `md` or `lg`.

## Installation

```ts
import { NuiProgress } from '@numior/vue';
import '@numior/vue/styles/progress.css';
```

## Usage

<Configurator name="NuiProgress" />

## Examples

### A live value

Update `value` as the work goes, and the bar moves smoothly to the new value. Show the
percentage next to the bar as plain text; the bar does not print it.

<Example name="progress/Live" />

## Accessibility

The component is a native `<progress>`, so a screen reader announces a progress bar and reads
its value. `label` names the bar, and `valueText` replaces the percentage with words, such as
"12 of 40 files".

When reduced motion is on in the system, the segment runs along the bar twice as slowly.

## API

<ApiReference name="NuiProgress" />
