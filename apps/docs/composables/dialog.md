# useDialog

`useDialog(element, options)` открывает и закрывает нативный `<dialog>` по модели `open`.
Используйте его для своего модального окна, если [Dialog](/components/dialog) не подходит.

`show()` открывает окно, `close(returnValue)` закрывает его. Обработчики из `attrs` повесьте на
`<dialog>`: они закрывают окно по Escape и клику по подложке. `covered` равен `true`, когда
поверх открыто другое окно.

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

`dismissible: false` запрещает закрывать окно по Escape и клику по подложке.
`closeOnBackdrop: false` отключает только закрытие по клику.

Пока окно открыто, страница под ним не прокручивается. После закрытия фокус возвращается на
кнопку, которая открыла окно. На этом композабле работают [Dialog](/components/dialog) и
[Drawer](/components/drawer).
