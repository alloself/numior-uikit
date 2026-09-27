# Empty

`NuiEmpty` explains why there is nothing in place of the data and offers an action. It holds an
icon or an illustration, `title`, `description` and the `actions` slot. The compact `size="sm"` is what
[List](/en/components/list), `NuiSelect` and `NuiCombobox` show without matches.

<Example name="empty/Basic" />

## Installation

```ts
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
```

## Usage

<Configurator name="NuiEmpty" />

## Examples

### Compact

`size="sm"` for lists and dropdowns; `hideIcon` removes the icon.

<Example name="empty/Compact" />

## Accessibility

The title is a paragraph, not a heading: an empty state lives inside a section and must not
break the heading order. The icon is decorative and the text carries the meaning, so a `title`
or a `description` is required.

## API

<ApiReference name="NuiEmpty" />
