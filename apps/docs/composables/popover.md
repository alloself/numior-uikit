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

## После отпускания и под неподвижной мышью

Панель, показанная по `contextmenu` или долгому нажатию, браузер закрывает на `pointerup` того же
нажатия. Функция из `useAfterRelease()` принимает событие и действие и выполняет его после
отпускания кнопки, а если кнопка уже отпущена — сразу. Действие, которое ещё ждёт, снимается
вместе с компонентом.

`useRestingHover(target)` держит `hovered`, пока мышь стоит на месте, даже если элемент под ней
исчез. Так стопка уведомлений не сворачивается, когда закрылось уведомление под курсором.
Наведение кончается первым движением мимо `target`, нажатием вне его или вызовом `end()`.

<SignatureReference :names="['useAfterRelease', 'AfterRelease', 'useRestingHover', 'RestingHover']" />
