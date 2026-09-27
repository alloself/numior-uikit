# usePopover

`usePopover(content, options)` управляет нативным Popover API: `contentAttrs` вешаются на
содержимое, `invokerAttrs` — на кнопку, а `open` синхронизируется с событиями `toggle`.
`useDelayedOpen` добавляет задержки открытия и закрытия для подсказок.

## Сигнатура

<SignatureReference :names="['usePopover', 'PopoverOptions', 'PopoverControl', 'useDelayedOpen', 'DelayedOpenOptions', 'DelayedOpen']" />

## Использование

```vue
<template>
  <button v-bind="popover.invokerAttrs.value" @click="popover.toggle()">Фильтры</button>
  <div ref="panel" v-bind="popover.contentAttrs.value">…</div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { usePopover } from '@numior/vue';

const open = ref(false);
const panel = useTemplateRef<HTMLElement>('panel');
const popover = usePopover(panel, { open, mode: 'auto' });
</script>
```

Режим `auto` закрывает поповер кликом снаружи и Escape, `manual` оставляет закрытие коду;
`raise()` поднимает открытый поповер над соседями. [Popover](/components/popover) и
[Tooltip](/components/tooltip) построены на этих композаблах.
