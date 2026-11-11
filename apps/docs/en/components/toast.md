# Toast

A toast is a short message about the result of an action: "Draft saved", "Could not send".
Toasts are called from code through `useToast()`, and `NuiToaster` displays them.

<Example name="toast/Basic" />

Put one `<NuiToaster />` in the root component, preferably at the end of the template. On this
site it already sits in the layout, so the examples only call `useToast()`.

## Installation

```ts
import { NuiToaster, useToast } from '@numior/vue';
import '@numior/vue/styles/toast.css';
```

## Examples

### Replacing a toast

The `show` method returns the `id` of the toast. Calling `show` again with the same `id` changes
the text and restarts the countdown. This way one toast follows an operation from "Publishing
the report…" to "Report published".

<Example name="toast/Update" />

## Behaviour

The `success`, `error`, `warning` and `info` methods take a title and set the color of the toast.
The `show` method takes all options at once:

- `title` and `description` — the title and the text;
- `tone` — the color: `neutral`, `info`, `success`, `warning` or `error`;
- `duration` — how long the toast stays, in milliseconds, 5000 by default; `0` keeps it until it
  is closed;
- `action` — an action button with `label` and `onClick`;
- `closable` — the close button, shown by default; `false` removes it;
- `id` — the key used to replace the toast.

Toasts appear in the corner of the screen set by `placement`, `top-end` by default. A new toast
comes to the front, and the previous ones shrink and stack behind it.

On hover or focus the stack expands into a list, and with `expand` it stays expanded. While the
pointer is over the stack, the focus is inside it or the browser tab is hidden, the countdown
pauses. It pauses for toasts that appear or leave the queue in the meantime too.

The stack stays expanded when the toast under a resting pointer closes, and collapses when the
pointer moves away. A toast closes after its action. When the action shows a toast with the same
`id`, that toast takes its place.

When a focused toast closes, keyboard focus moves to the neighbouring one and, after the last
one, back to where it entered the stack from. After closing with the pointer the focus returns
at once, and the remaining toasts keep counting.

The `createNuiConfig` plugin keeps a separate toast queue for every app and every SSR request.
Its `toasts` option sets the display time `duration`, the exit animation length `exitDuration`
and the number of toasts on screen `limit`.

## Accessibility

Screen readers announce toasts through `aria-live="polite"`, and a toast with `tone="error"` gets
`role="alert"` and is announced at once. Toasts are shown in the browser top layer, so dialogs
and menus never cover them.

A toast does not take the focus when it appears. Esc closes the focused toast and moves the focus
to its neighbour. Above an open modal dialog a toast is visible, but its buttons do not work
until the dialog closes.

## API

<ApiReference :names="['NuiToaster', 'NuiToast']" />
