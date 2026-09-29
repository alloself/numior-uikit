# useReorder

`useReorder(options)` перетаскивает элементы списка указателем и клавиатурой: порог начала
драга, автопрокрутка у краёв контейнера, события `grabbed`, `moved`, `dropped`, `cancelled`
и зеркалирование в RTL. Перестановку делает ваш `onMove(from, to)`.

## Сигнатура

<SignatureReference :names="['useReorder', 'ReorderOptions', 'Reorder', 'ReorderState', 'ReorderEvent']" />

## Использование

```ts
import { useReorder } from '@numior/vue';

const reorder = useReorder({
  axis: 'y',
  count: () => rows.value.length,
  container: list,
  indexAt: (client, from) => indexUnderPointer(client, from),
  onMove: (from, to) => rows.value.splice(to, 0, ...rows.value.splice(from, 1)),
});
```

`onPointerdown(index, event)` вешается на ручку строки, `onKeydown(index, event)` — на неё
же для стрелок с модификатором, `state` описывает фазу: `idle`, `pending`, `dragging`,
`keyboard`. Так переставляют поля `NuiFieldArray` в формах.
