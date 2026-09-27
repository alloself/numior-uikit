# Separator

`NuiSeparator` is a line between blocks: horizontal in the flow or vertical inside a row of
buttons. With `label` the text sits in the middle of the line, and `decorative` drops the
semantics of purely visual dividers.

<Example name="separator/Basic" />

## Installation

```ts
import { NuiSeparator } from '@numior/vue';
import '@numior/vue/styles/separator.css';
```

## Usage

<Configurator name="NuiSeparator" />

## Examples

### In a row

`orientation="vertical"` stretches the line to the row height. The second divider is
`decorative`: a screen reader does not announce it.

<Example name="separator/Vertical" />

## Accessibility

Without `decorative` the line carries `role="separator"` and `aria-orientation`; with it,
`role="none"`. The `label` text reads as ordinary text between the blocks.

## API

<ApiReference name="NuiSeparator" />
