# useDialog

`useDialog(element, options)` управляет нативным `<dialog>`: `show()` открывает его модально,
`close(returnValue)` закрывает, `attrs` обрабатывают Escape, клик по подложке и событие
`close`. `covered` говорит, что поверх открыт другой диалог.

## Сигнатура

<SignatureReference :names="['useDialog', 'DialogOptions', 'DialogControl']" />

## Использование

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

`dismissible: false` запрещает закрытие по Escape и подложке; фокус возвращается на кнопку,
открывшую диалог. [Dialog](/components/dialog) и [Drawer](/components/drawer) построены на
этом композабле.
