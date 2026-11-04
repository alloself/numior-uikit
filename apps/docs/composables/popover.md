# usePopover

`usePopover(content, options)` открывает и закрывает панель через Popover API по модели `open`.
Используйте его для своей всплывающей панели, если [Popover](/components/popover) не подходит.

Повесьте `contentAttrs` на панель, а `invokerAttrs` — на кнопку, которая её открывает.
`useDelayedOpen` добавляет задержку перед открытием и закрытием, как у подсказки.

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

В режиме `auto` панель закрывается по клику снаружи и по Escape. В режиме `manual` она
закрывается, только когда вы меняете `open`. `raise()` поднимает открытую панель над другими.

На этих композаблах работают [Popover](/components/popover) и [Tooltip](/components/tooltip).
