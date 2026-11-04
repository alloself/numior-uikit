# Empty

`NuiEmpty` fills the place of an empty list, table or search result. It explains why there is
nothing here and suggests what to do next.

<Example name="empty/Basic" />

Pass the heading in `title`, the explanation in `description`, and put buttons into the `actions`
slot. A custom illustration in place of the icon goes into the `media` slot.

## Installation

```ts
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
```

## Usage

<Configurator name="NuiEmpty" />

## Examples

### Compact

`size="sm"` shrinks the icon and the spacing for an empty list or dropdown, and `hideIcon` removes
the icon. [List](/en/components/list), `NuiSelect` and `NuiCombobox` show the same compact state
when there are no options.

<Example name="empty/Compact" />

## Accessibility

The heading is rendered as a plain paragraph, so it does not break the heading order of the page.
Screen readers skip the icon, so put the meaning into `title` or `description`.

## API

<ApiReference name="NuiEmpty" />
