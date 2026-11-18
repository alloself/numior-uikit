# Splitter

Two panes with a movable boundary.

<Example name="splitter/Basic" />

Put the panes into the `start` and `end` slots. The share of the first pane lives in
`v-model:ratio`, and its limits in `min` and `max`.

## Installation

```ts
import { NuiSplitter } from '@numior/kit';
```

## Examples

### Stack the panes one above the other

Set `orientation="vertical"`.

<Example name="splitter/Vertical" />

## Behavior

The splitter does not stretch to its parent by itself: give it a height, such as `h-full` inside
a parent with a height. Content taller than a pane scrolls inside it.

## Accessibility

The boundary takes the focus with Tab, and a screen reader announces its position in percent.
The default label is "Resize panes"; pass your own in `label`.

<KeyboardReference name="NuiSplitter" />

## API

<ApiReference name="NuiSplitter" />
