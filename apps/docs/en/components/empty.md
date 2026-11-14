# Empty

A message in place of an empty list.

<Example name="empty/Basic" />

Put the reason in `title` and `description`, and the next step in the `actions` slot.

## Installation

```ts
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
```

## Usage

Change the size or hide the icon.

<Configurator name="NuiEmpty" />

## Examples

### Fit into a narrow space

Set `size="sm"`.

<Example name="empty/Compact" />

[List](/en/components/list), [Tree](/en/components/tree), `NuiSelect` and `NuiCombobox` show such
a placeholder on their own when they are empty.

## Accessibility

The title is a plain paragraph, so it does not break the heading order of the page. Screen
readers skip the icon: put the meaning into `title` or `description`.

## API

<ApiReference name="NuiEmpty" />
