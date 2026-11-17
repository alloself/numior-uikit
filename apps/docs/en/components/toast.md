# Toast

A short notification about the result of an action.

<Example name="toast/Basic" />

Put one `<NuiToaster />` in the root component:

```vue
<template>
  <RouterView />
  <NuiToaster />
</template>
```

Then call `useToast()` in any component, and its toasts appear in this toaster.

## Installation

```ts install
import { NuiToaster, useToast } from '@numior/kit';
```

## Examples

### Update a toast in place

Call `show` with the same `id`.

<Example name="toast/Update" />

The toast keeps its place and takes the new title, tone and action without appearing again.

### Let the user undo an action

Pass a `label` and an `onClick` handler to `action`.

<Example name="toast/Undo" />

A click on the action runs the handler and closes the toast.

## Behavior

### Pick a tone

Call the method named after the tone, or pass `tone` to `show`:

```ts
const toast = useToast();

toast.error('Payment failed', { description: 'The bank declined the card' });
toast.show({ title: 'Invoice sent', tone: 'info' });
```

Without `tone`, a toast from `show` is neutral and has no icon. All the options are listed on the
[useToast](/en/composables/toast) page.

### Set where toasts appear and how many

Set `placement` and `expand` on `NuiToaster`, and the other options in `toasts` of the
`createNuiConfig` plugin:

```ts
app.use(createNuiConfig({ toasts: { duration: 4000, limit: 3 } }));
```

| Option         | What it changes                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| `placement`    | Where on the screen toasts appear, `top-end` by default                      |
| `expand`       | Keeps the stack open as a list, not only on hover                            |
| `duration`     | Display time in milliseconds, 5000 by default; `0` keeps toasts until closed |
| `exitDuration` | Length of the exit animation in milliseconds, 200 by default                 |
| `limit`        | How many toasts are on screen at once; the rest wait their turn              |

A new toast comes to the front, and the earlier ones shrink into a stack behind it. The stack
opens into a list on hover or focus.

The countdown pauses while the pointer or the focus is on the toasts and while the browser tab is
hidden, for new toasts too. The stack stays open under a resting pointer, even when the toast under
it closes.

## Accessibility

A screen reader announces toasts through `aria-live="polite"`, and an `error` toast at once
through `role="alert"`. A toast does not take the focus when it appears.

Esc closes the focused toast and moves the focus to the next one. After the last one, the focus goes back to where it came from.

## API

<ApiReference :names="['NuiToaster', 'NuiToast']" />
