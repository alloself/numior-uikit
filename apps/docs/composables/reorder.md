# useReorder

`useReorder(options)` даёт переставлять пункты списка мышью, пальцем и с клавиатуры. Сам список
меняет ваш обработчик `onMove(from, to)`.

Перетаскивание начинается, когда указатель сдвинулся на `threshold` пикселей, по умолчанию на 5.
У края контейнера список прокручивается сам, а Escape отменяет перетаскивание.

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

Повесьте `onPointerdown(index, event)` и `onKeydown(index, event)` на ручку пункта. С
клавиатуры пункт берут Enter или пробелом, двигают стрелками и ставят на место повторным
нажатием Enter или пробела.

`state.phase` показывает этап: `idle`, `pending`, `dragging` или `keyboard`. `onEvent` получает
события `grabbed`, `moved`, `dropped` и `cancelled`, по ним удобно сообщать о перестановке
экранному диктору. Так переставляются группы полей в `NuiFieldArray`.

## Автопрокрутка у краёв

`useEdgeScroll(options)` — та же прокрутка у края, но без перетаскивания. `follow({ x, y })`
прокручивает контейнер, пока точка ближе 24 пикселей к его краю, и вызывает `onStep` после
каждого шага. `stop()` останавливает прокрутку.

Так [Table](/components/table) прокручивается, когда выделение ячеек тянут за край.

<SignatureReference :names="['useEdgeScroll', 'EdgeScrollOptions', 'EdgeScroll', 'EdgePoint']" />
