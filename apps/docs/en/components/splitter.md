# Splitter

`NuiSplitter` splits an area into two panes with a draggable divider. The share of the first
pane lives in `v-model:ratio` from 0 to 1 and is clamped between `min` and `max`.

<Example name="splitter/Basic" />

## Installation

```ts
import { NuiSplitter } from '@numior/vue';
import '@numior/vue/styles/splitter.css';
```

## Examples

### Vertical

`orientation="vertical"` stacks the panes; `step` sets the arrow step.

<Example name="splitter/Vertical" />

## Behaviour

The divider is dragged with a pointer or a mouse, the panes get their size through grid
without re-rendering the content. The parent sets the height: the component stretches to it.

## Accessibility

The divider is a focusable `role="separator"` with `aria-valuenow`, `aria-valuemin` and
`aria-valuemax` in percent, `aria-controls` of the first pane and a name from `label`.

<KeyboardReference name="NuiSplitter" />

## API

<ApiReference name="NuiSplitter" />
