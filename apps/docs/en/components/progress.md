# Progress

`NuiProgress` is a native `<progress>`: the browser provides the `progressbar` role, the value
and the maximum. The styles draw the track, the tone colour and the indeterminate animation.

<Example name="progress/Basic" />

## Installation

```ts
import { NuiProgress } from '@numior/vue';
import '@numior/vue/styles/progress.css';
```

## Usage

<Configurator name="NuiProgress" />

## Examples

### A live value

The value changes through `value`; the caption next to it shows the percentage to sighted users.

<Example name="progress/Live" />

## Accessibility

Without `value` the bar is indeterminate: it slides along the track, and under
`prefers-reduced-motion` the animation slows down by half. `label` gives the accessible name,
`valueText` the value in words for a screen reader.

## API

<ApiReference name="NuiProgress" />
