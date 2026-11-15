# Separator

A line between blocks of a page or between buttons of a toolbar.

<Example name="separator/Basic" />

## Installation

```ts install
import { NuiSeparator } from '@numior/vue';
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

The text from `label` or the slot becomes the name of the separator, and the screen reader reads
it along with the role.

## API

<ApiReference name="NuiSeparator" />
