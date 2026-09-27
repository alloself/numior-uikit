# useDialog

`useDialog(element, options)` drives a native `<dialog>`: `show()` opens it modally,
`close(returnValue)` closes it, `attrs` handle Escape, the backdrop click and the `close`
event. `covered` tells that another dialog is open on top.

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

`dismissible: false` blocks closing on Escape and the backdrop; the focus returns to the
button that opened the dialog. [Dialog](/en/components/dialog) and [Drawer](/en/components/drawer)
are built on this composable.
