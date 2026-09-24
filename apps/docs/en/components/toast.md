# Toast

Toasts are shown imperatively: `useToast()` returns a service and one `<NuiToaster>` per
app renders the queue. The region lives in the top layer as an always-open
`popover="manual"` with `aria-live="polite"`, so toasts are announced and stay above other
layers. The default placement is `top-end`, the default duration is 5 seconds for every
tone, and there is no visible limit.

<script setup>
import { useToast } from '@numior/vue'
const toast = useToast()
const undo = () => toast.success('Deletion undone')
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton @click="toast.info('Draft saved', { description: 'Sync in a minute' })">Info</NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Project published')">Success</NuiButton>
  <NuiButton variant="outline" tone="error" @click="toast.error('Could not save', { duration: 0, action: { label: 'Retry', onClick: undo } })">Error with action</NuiButton>
  <NuiToaster label="Notifications" close-label="Close" />
</div>

```vue
<script setup lang="ts">
import { NuiButton, NuiToaster, useToast } from '@numior/vue';

const toast = useToast();
const save = () => toast.success('Project published');
</script>

<template>
  <NuiButton @click="save">Publish</NuiButton>
  <NuiToaster label="Notifications" close-label="Close" />
</template>
```

## Setup

Install the `createNuiConfig` plugin so every app (and every SSR request) gets its own
toast store, and place one `<NuiToaster>` near the end of the root component. Without the
plugin a shared client store is used, fine for a playground but not for SSR.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';

createApp(App)
  .use(createNuiConfig({ toasts: { duration: 4000 } }))
  .mount('#app');
```

Store options: `duration` (5000 ms by default), `exitDuration` (200 ms, equal to
`--nui-duration-normal`), `limit` (maximum visible; the rest wait in a queue).

## Service

Call `useToast()` in a component `setup()` or through `app.runWithContext`. Methods:
`show(options)`, `success(title, options)`, `error(...)`, `warning(...)`, `info(...)`,
`dismiss(id)`, `clear()`. `show` returns the id; calling `show` again with the same `id`
replaces the toast and restarts its timer.

| Option        | Type                                             | Description                                      |
| ------------- | ------------------------------------------------ | ------------------------------------------------ |
| `title`       | `string`                                         | Heading                                          |
| `description` | `string`                                         | Secondary text                                   |
| `tone`        | `neutral \| info \| success \| warning \| error` | Tone, icon and `role="alert"` for `error`        |
| `duration`    | `number`                                         | Ms until auto-dismiss, `0` keeps it until closed |
| `action`      | `{ label, onClick }`                             | Action button; the toast closes after the click  |
| `dismissible` | `boolean`                                        | Close button (`true` by default)                 |
| `id`          | `string`                                         | Stable id for replacement                        |

## Stack

A new toast appears at the edge and becomes the front one; earlier toasts slide behind it
as scaled-down cards, two of them peeking out. Hovering or focusing inside the region
expands the stack into a spaced list, and `expand` keeps it expanded permanently. Card
heights are measured with `ResizeObserver`, so re-layout moves at `--nui-duration-slow`
while enter and exit use `--nui-duration-normal`.

## Behavior

While the stack is hovered or contains focus every timer pauses, as it does while the tab
is hidden. Escape closes the focused toast and moves focus to a neighbour; toasts never steal focus
when they appear. A toast shown above an open modal dialog is raised above it but stays
inert (not clickable, not announced) until the dialog closes; that is platform behavior.

## Custom card

The slot runs once per toast with `{ toast, dismiss }` inside a stack item, so placement,
layering and motion stay with the region. `NuiToast` is exported as a part in case you
want to wrap the standard card.

```vue
<NuiToaster placement="bottom" v-slot="{ toast, dismiss }">
  <article class="my-toast">
    <strong>{{ toast.title }}</strong>
    <button type="button" @click="dismiss">Hide</button>
  </article>
</NuiToaster>
```

## API

`NuiToaster`: `placement` (`top-start | top | top-end | bottom-start | bottom | bottom-end`,
default `top-end`), `expand` (keeps the stack expanded), `label` (region `aria-label`),
`closeLabel`, `id`. On narrow screens the region spans the full width. Block `nui-toaster`
with `--placement-*` and `--expanded` modifiers, element `__item` with `--behind` and
`--leaving` modifiers; region variables `--_inset`, `--_width`, `--_gap`, `--_peek`,
`--_direction`, `--_front-size`, item variables `--_index`, `--_offset`, `--_size`.

`NuiToast`: `toast` (store record), `closeLabel`. Block `nui-toast`, modifiers `--tone-*`,
`--leaving`; elements `__icon`, `__body`, `__title`, `__description`, `__action`, `__close`;
variable `--_tone`.
