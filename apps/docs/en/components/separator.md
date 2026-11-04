# Separator

`NuiSeparator` is a line between blocks of a page or between buttons in a toolbar. With a label
it divides, for example, signing in with Google from signing in by email.

<Example name="separator/Basic" />

The `label` prop or the default slot sets the text in the middle of the line.

## Installation

```ts
import { NuiSeparator } from '@numior/vue';
import '@numior/vue/styles/separator.css';
```

## Usage

<Configurator name="NuiSeparator" />

## Examples

### In a row

`orientation="vertical"` draws a vertical line as tall as the row, for example between toolbar
buttons.

<Example name="separator/Vertical" />

## Accessibility

A screen reader announces the separator as a boundary between parts of the page. When the line
only decorates a row, pass `decorative` and the screen reader skips it, as with the second line
in the example.

The `label` text reads as ordinary text.

## API

<ApiReference name="NuiSeparator" />
