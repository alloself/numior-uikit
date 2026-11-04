# Splitter

`NuiSplitter` splits an area into two panes with a boundary the user can move: an editor and
a preview, a mail list and a message. The panes go into the `start` and `end` slots.

<Example name="splitter/Basic" />

The share of the first pane lives in `v-model:ratio` as a number from 0 to 1, `0.5` by default.
The `min` and `max` props stop a pane from shrinking further, `0.1` and `0.9` by default.

## Installation

```ts
import { NuiSplitter } from '@numior/vue';
import '@numior/vue/styles/splitter.css';
```

## Examples

### Vertical

`orientation="vertical"` stacks the panes one above the other. `step` sets how far the arrow
keys move the boundary, `0.05` by default.

<Example name="splitter/Vertical" />

## Behaviour

The boundary is dragged with a mouse, a pen or a finger. Set the height on `NuiSplitter` itself
or on its parent: the panes fill it, and extra content scrolls inside a pane.

## Accessibility

The boundary takes focus with Tab, and a screen reader announces its position in percent. The
default label is "Resize panes"; pass your own in `label`.

<KeyboardReference name="NuiSplitter" />

## API

<ApiReference name="NuiSplitter" />
