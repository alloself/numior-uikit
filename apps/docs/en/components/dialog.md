# Dialog

`NuiDialog` is a native `<dialog>` opened with `showModal()`. The browser keeps the focus
inside, makes the background inert, closes on Esc and returns the focus to the button. The
element stays in the DOM where you wrote it, so the theme and the reading direction are
inherited without Teleport.

<Example name="dialog/Confirm" />

## Installation

```ts
import { NuiDialog } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
```

## Examples

### A required dialog

`closable="false"` removes the cross and blocks Esc and backdrop clicks; only your button
closes it.

<Example name="dialog/Required" />

### Several levels

A dialog above a dialog stacks higher in the top layer; there is always one dimming layer,
under the top one. Esc closes only the top level, the focus returns to the button that opened
it.

<Example name="dialog/Stacked" />

### At the top edge

`placement="top"` docks the dialog to the top of the screen, so a form does not jump when its
height changes.

<Example name="dialog/Placement" />

## Accessibility

`title` and `description` are linked through `aria-labelledby` and `aria-describedby` with ids
known on the server. The first interactive element of the body gets the focus first, the close
button comes last. While a dialog is open the page does not scroll and its width stays the same.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDialog" />
