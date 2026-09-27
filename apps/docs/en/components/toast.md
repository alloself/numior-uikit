# Toast

Toasts are shown imperatively: `useToast()` returns a service, and one `<NuiToaster>` per app
renders the queue. The region lives in the top layer with `aria-live="polite"`, so toasts are
announced and stay above other layers.

<Example name="toast/Basic" />

## Installation

```ts
import { NuiToaster, useToast } from '@numior/vue';
import '@numior/vue/styles/toast.css';
```

Put one `<NuiToaster />` near the end of the root component; on this site it sits in the
layout, so the examples call only the service. The `createNuiConfig` plugin gives every app and
SSR request its own store; the options are `toasts: { duration, exitDuration, limit }`.

## Examples

### Replacing a toast

`show` returns an id. A second `show` with the same `id` replaces the toast and restarts its
timer, so one toast follows an operation from start to result.

<Example name="toast/Update" />

## Behaviour

A new toast appears at the edge and becomes the top one; the previous ones move behind it as
smaller cards. Hover or focus expands the stack into a list, `expand` keeps it expanded. While
the stack is hovered, holds the focus or the tab is hidden, the timers pause.

The `show` options: `title`, `description`, `tone`, `duration` (`0` until the user closes it),
`action` with `label` and `onClick`, `dismissible`, `id`. A toast with `tone="error"` gets
`role="alert"`.

## Accessibility

Toasts never take the focus when they appear. Esc closes the focused toast and moves the focus
to its neighbour. Above an open modal dialog a toast rises but stays inert until the dialog
closes.

## API

<ApiReference :names="['NuiToaster', 'NuiToast']" />
