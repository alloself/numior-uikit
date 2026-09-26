# Dialog

`NuiDialog` is a native `<dialog>` opened with `showModal()`. The browser keeps focus
inside, makes the background inert, closes on Esc, paints the `::backdrop` and returns
focus to the invoker. The element stays in the DOM where you wrote it, so theme,
density and writing direction are inherited without Teleport or `z-index`.

<script setup>
import { ref } from 'vue'
const open = ref(false)
const result = ref('')
const strict = ref(false)
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton @click="open = true">Delete project</NuiButton>
  <span>Result: {{ result || '—' }}</span>
  <NuiDialog v-model:open="open" title="Delete project?" description="This cannot be undone." @close="result = $event">
    <p>All project data will be deleted together with its history.</p>
    <template #footer>
      <form method="dialog" class="nui-flex nui-gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Cancel</NuiButton>
        <NuiButton type="submit" value="confirm" tone="error">Delete</NuiButton>
      </form>
    </template>
  </NuiDialog>
</div>

```vue
<NuiDialog
  v-model:open="open"
  title="Delete project?"
  description="This cannot be undone."
  @close="result = $event"
>
  <p>All project data will be deleted.</p>
  <template #footer>
    <form method="dialog" class="nui-flex nui-gap-2">
      <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Cancel</NuiButton>
      <NuiButton type="submit" value="confirm" tone="error">Delete</NuiButton>
    </form>
  </template>
</NuiDialog>
```

A form with `method="dialog"` closes the dialog natively; the `close` event carries the
`returnValue`, which equals the `value` of the pressed button. Without a form, close it
through `v-model:open` or the close button.

## Required dialog

`closable: false` removes the close button and blocks Esc and backdrop clicks. Such a
dialog closes only through your own button. Chromium still closes it on a second Esc
without new user activation, per its close-watcher rules, so treat this as a hint rather
than a lock.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton variant="outline" @click="strict = true">Open</NuiButton>
  <NuiDialog v-model:open="strict" :closable="false" title="Confirm the terms">
    <p>You can continue only after confirming.</p>
    <template #footer>
      <NuiButton @click="strict = false">I confirm</NuiButton>
    </template>
  </NuiDialog>
</div>

## Stacked dialogs

A dialog opened above another modal dialog sits higher in the top layer, and there is
always a single dimming layer, right below the topmost dialog of the stack. Covered dialogs
get the `nui-dialog--covered` modifier with a transparent `::backdrop`, so the first dialog
ends up under the overlay of the second; when the top one closes the overlay returns to the
next. Escape closes only the top level and focus returns to the button that opened it.

## Top layer and motion

An open dialog lives in the top layer: ancestor `overflow` does not clip it and
`z-index` neighbours do not cover it. While it is modal, `html` gets `overflow: hidden`
with `scrollbar-gutter: stable`. The entry animates through `@starting-style` and
`transition-behavior: allow-discrete`; the exit animates where the browser supports the
`overlay` transition (Chromium) and closes instantly elsewhere. Under
`prefers-reduced-motion` the durations are zero.

## Accessibility

`title` and `description` (or the slots of the same name) are linked through
`aria-labelledby` and `aria-describedby` with ids known on the server. The first
interactive element of the body receives focus; the close button is last in the DOM.
The close button name comes from the [dictionary](/en/localization#dialog) in the
configured language; `closeLabel` replaces it.

## API

| Prop              | Type                   | Default                                        | Description                            |
| ----------------- | ---------------------- | ---------------------------------------------- | -------------------------------------- |
| `v-model:open`    | `boolean`              | `false`                                        | Whether the dialog is open             |
| `id`              | `string`               | generated                                      | Element id; heading ids derive from it |
| `title`           | `string`               | —                                              | Heading; `title` slot                  |
| `description`     | `string`               | —                                              | Description; `description` slot        |
| `size`            | `'sm' \| 'md' \| 'lg'` | `'md'`                                         | Width 24 / 32 / 48rem                  |
| `closable`        | `boolean`              | `true`                                         | Close button, Esc and backdrop click   |
| `closeOnBackdrop` | `boolean`              | `true`                                         | Backdrop click closes when `closable`  |
| `closeLabel`      | `string`               | [dictionary](/en/localization#dialog): “Close” | Accessible name of the close button    |

Event `close(returnValue: string)`. Slots: `default`, `title`, `description`, `footer`.
Modifiers `nui-dialog--size-*`; elements `__header`, `__title`, `__description`,
`__body`, `__footer`, `__close`; variables `--_width`, `--_padding`. The `useDialog` and
`useControlId` composables are exported for custom layers.
