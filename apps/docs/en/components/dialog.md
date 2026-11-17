# Dialog

A modal window over the page.

<Example name="dialog/Confirm" />

Put the buttons into a form with `method="dialog"`, and the `close` event receives the `value` of
the pressed one.

## Installation

```ts install
import { NuiDialog } from '@numior/kit';
```

## Usage

Open the dialog and change its size, placement and the ways to close it.

<Configurator name="NuiDialog" />

## Examples

### Require an answer

Turn off `closable`.

<Example name="dialog/Required" />

The dialog loses its close button, and neither Esc nor a click on the backdrop closes it until the
user picks one of your buttons.

### Open a dialog from a dialog

<Example name="dialog/Stacked" />

The page dims only once, under the top dialog, and Esc closes the top dialog first.

### Move a form dialog to the top edge

Set `placement="top"`.

<Example name="dialog/Placement" />

When a field appears in the form, the dialog grows downward and its title stays in place.

### Scroll long text

<Example name="dialog/Long" />

The text scrolls inside the dialog, while the title and the buttons stay in view.

## Behavior

The dialog stays in the markup where you put it, so it takes the theme and the text direction of
its parent.

## Accessibility

- A screen reader announces the `title` and the `description` when the dialog opens.
- The focus moves into the dialog on opening and returns to the button that opened it on
  closing.
- The page under the dialog ignores the pointer and the keyboard, and it neither scrolls nor
  shifts sideways.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDialog" />
