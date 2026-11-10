# useDialog

`useDialog(element, options)` opens and closes a native `<dialog>` from the `open` model. Use
it for your own modal window when [Dialog](/en/components/dialog) does not fit.

`show()` opens the window, `close(returnValue)` closes it. Put the handlers from `attrs` on the
`<dialog>`: they close the window on Escape and on a backdrop click. `covered` is `true` while
another window is open on top.

## Signature

<SignatureReference :names="['useDialog', 'DialogOptions', 'DialogControl']" />

## Usage

```vue
<template>
  <dialog ref="dialog" v-bind="control.attrs">
    <form method="dialog">…</form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useDialog } from '@numior/vue';

const open = ref(false);
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const control = useDialog(dialog, { open, closeOnBackdrop: true, onClose: (value) => save(value) });
</script>
```

`closable: false` stops the window from closing on Escape and on a backdrop click.
`closeOnBackdrop: false` turns off only the click.

While the window is open, the page under it does not scroll. After closing, focus returns to the
button that opened the window. [Dialog](/en/components/dialog) and
[Drawer](/en/components/drawer) are built on this composable.
