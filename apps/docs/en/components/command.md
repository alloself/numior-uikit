# Command

`NuiCommand` is a command palette: an input and a grouped list that filters as you type.
`NuiCommandDialog` opens the same palette in a modal dialog on a key combo; the search of
these docs is built on it.

<Example name="command/Basic" />

## Installation

```ts
import { NuiCommand, NuiCommandDialog } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/command.css';
```

## Examples

### In a dialog

`NuiCommandDialog` opens from a button through `v-model:open` or on the `hotkey` combo. The
default is `mod+k`; the example takes `mod+j` so it does not fight the docs search.
Selecting a command closes the dialog.

<Example name="command/Dialog" />

## Behaviour

Commands are `NuiOption` entries with optional `shortcut` and `keywords`; a group is an
object `{ label, items }`. The built-in filter matches the query against the label and the
keywords. For server search pass `:filter="false"`, listen to `search` and provide `items`
as a function of the query; `loading` shows the loading state.

## Accessibility

The input is a `role="combobox"` with `aria-activedescendant`, the list a `listbox` with the
active command and no focus move. The dialog is modal, closes on Escape and returns the
focus to the button.

<KeyboardReference name="NuiCommandDialog" />

## API

<ApiReference :names="['NuiCommand', 'NuiCommandDialog']" />
