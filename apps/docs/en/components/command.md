# Command

`NuiCommand` is a command palette: a search field with a list of commands under it that narrows
as you type. `NuiCommandDialog` opens the palette in a dialog on a key combination; this is how
the search of these docs works.

<Example name="command/Basic" />

## Installation

```ts
import { NuiCommand, NuiCommandDialog } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/command.css';
```

## Usage

Pass the commands in `items`: each has a `value`, a `label` and optionally an `icon` and a
`description`. To split commands into groups, pass `{ label, items }` objects. The chosen command
arrives in the `select` event.

The `shortcut` field shows a key combination next to a command, such as `mod+1`. Your app decides
what pressing that combination does.

Type a query in the palette and change its frame, the input hint and the loading state.

<Configurator name="NuiCommand" />

## Examples

### In a dialog

`NuiCommandDialog` opens through `v-model:open` or with the key combination from `hotkey`, which
is Ctrl+K by default and ⌘K on macOS. The example opens with Ctrl+J, because Ctrl+K opens the
search of these docs.

<Example name="command/Dialog" />

Choosing a command closes the dialog, and `:close-on-select="false"` keeps it open.

## Behaviour

The palette looks for the typed text in the label, the description and the `keywords` list. This
way the "Button" command is also found by "btn".

For server-side search pass `:filter="false"` and listen to the `search` event, which arrives with
the query text. Pass the found commands to `items`, and turn on `loading` while they load.

## Accessibility

Focus stays in the search field, and the arrow keys move through the commands. The dialog closes
on Escape and returns focus to the element that opened it.

<KeyboardReference name="NuiCommandDialog" />

## API

<ApiReference :names="['NuiCommand', 'NuiCommandDialog']" />
