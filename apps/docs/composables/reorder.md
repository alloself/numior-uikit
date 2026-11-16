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
нажатием Enter или пробела. `onBlur(index)` на событии `blur` ручки отменяет перенос, когда
фокус уходит с неё.

`state.phase` показывает этап: `idle`, `pending`, `dragging` или `keyboard`. `onEvent` получает
события `grabbed`, `moved`, `dropped` и `cancelled`, по ним удобно сообщать о перестановке
экранному диктору. Так переставляются группы полей в `NuiFieldArray`.

## Автопрокрутка у краёв

`useEdgeScroll(options)` — та же прокрутка у края, но без перетаскивания. `follow({ x, y })`
прокручивает контейнер, пока точка ближе 24 пикселей к его краю, и вызывает `onStep` после
каждого шага. `stop()` останавливает прокрутку.

`follow` только запоминает точку, а шаг делается один раз за кадр. Поэтому скорость не зависит
от того, как часто двигается указатель.

Так [Table](/components/table/editing) прокручивается, когда выделение ячеек тянут за край.

<SignatureReference :names="['useEdgeScroll', 'EdgeScrollOptions', 'EdgeScroll', 'EdgePoint']" />

## Нажатия и протяжка

`usePointerSession()` ведёт протяжку от нажатия до отпускания. `begin({ move, up, cancel })`
подключает обработчики, `end()` отключает их. С `{ capture: true }` они получают события на фазе
захвата.

Слушатели висят на окне, одни на всю страницу. Протяжка их не добавляет и не снимает: WebKit на
каждое такое изменение пересчитывает стили всего документа.

`createPressTargets()` раздаёт нажатия частям контейнера через один слушатель `pointerdown`.
Повесьте `onPointerdown` на контейнер, а части отметьте через
`usePressTarget(targets, element, press)` или ref-функцию `pressRefOf(targets, press)`.

Нажатие идёт от элемента под указателем вверх до контейнера, `stopPropagation()` останавливает
обход. Так устроены ручки колонок и строк в [Table](/components/table/columns).

```ts
import { createPressTargets, usePointerSession, usePressTarget } from '@numior/primitives';

const targets = createPressTargets();
const session = usePointerSession();

usePressTarget(targets, grip, () => {
  session.begin({
    move: (event) => follow(event.clientX),
    up: session.end,
    cancel: session.end,
  });
});
```

<SignatureReference :names="['usePointerSession', 'PointerSessionOptions', 'PointerSession', 'PointerSessionHandlers', 'createPressTargets', 'usePressTarget', 'pressRefOf', 'PressTargets']" />
