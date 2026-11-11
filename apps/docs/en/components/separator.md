# Separator

A line between blocks of a page or between buttons of a toolbar.

<Example name="separator/Basic" />

## Installation

```ts
import { NuiSeparator } from '@numior/vue';
import '@numior/vue/styles/separator.css';
```

## Usage

Change the direction and the label of the line.

<Configurator name="NuiSeparator" />

## Examples

### Divide toolbar buttons

Set `orientation="vertical"`, and the line takes the height of the row.

<Example name="separator/Vertical" />

## Accessibility

A screen reader announces the line as a separator between parts of the page. When the line is
only decoration, pass `decorative`, and the screen reader skips it.

## API

<ApiReference name="NuiSeparator" />
