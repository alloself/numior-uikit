# Command

A command palette with search.

<Example name="command/Basic" />

## Installation

```ts install
import { NuiCommand, NuiCommandDialog } from '@numior/kit';
```

## Usage

Describe the commands in `items`:

| Field         | What it holds                                                  |
| ------------- | -------------------------------------------------------------- |
| `value`       | A unique value of the command                                  |
| `label`       | The name in the list                                           |
| `description` | A second line under the name                                   |
| `icon`        | An icon before the name, by its name or as a component         |
| `shortcut`    | A key combination at the end of the row, such as `mod+shift+o` |
| `keywords`    | More words the search finds the command by                     |

Group the commands with `{ label, items }` objects. The chosen command arrives in the `select`
event. A `shortcut` only shows the keys, and your app decides what they do.

Type a query and change the frame, the input hint and the loading state of the palette.

<Configurator name="NuiCommand" />

## Examples

### Open the palette in a dialog

Use `NuiCommandDialog` and set the key combination in `hotkey`.

<Example name="command/Dialog" />

Without `hotkey` the dialog opens on Ctrl+K, or ⌘K on macOS. The dialog above opens on Ctrl+J,
because Ctrl+K opens the search of these docs. Choosing a command closes the dialog, and
`:close-on-select="false"` keeps it open.

## Behavior

The palette matches the query against:

- the `label` of a command;
- its `description`;
- the words in `keywords`, so "Find a customer" also turns up for "client".

The search ignores case and accents, so "resume" finds "Résumé". The dialog opens with an empty
query unless your app has set a new one while the dialog was closed.

### Search commands on the server

Pass `:filter="false"` and listen to the `search` event, which receives the query text.

```vue
<NuiCommand :items="found" :filter="false" :loading="loading" @search="search" />
```

Put the found commands into `items` and turn on `loading` while they load.

## Accessibility

The focus stays in the search field, and the arrow keys move through the commands. The dialog
closes on Escape and returns the focus to the element that had it before.

<KeyboardReference name="NuiCommandDialog" />

## API

<ApiReference :names="['NuiCommand', 'NuiCommandDialog']" />
