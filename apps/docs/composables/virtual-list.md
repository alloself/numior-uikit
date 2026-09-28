# useVirtualList

`useVirtualList(container, options)` рендерит только видимые строки длинного списка: по
`count` и `itemSize` считает диапазон, отступы до и после него и общий размер. Контейнер
остаётся вашим, поэтому строки можно класть в `<tbody>` или любой список.

<Example name="composables/VirtualList" />

## Сигнатура

<SignatureReference
  :names="[
    'useVirtualList',
    'VirtualListOptions',
    'VirtualList',
    'VirtualItem',
    'createSizeIndex',
    'SizeIndex',
  ]"
/>

## Поведение

`items` — видимые элементы с индексом, началом и размером, `startSize` и `endSize` —
отступы-заполнители, `totalSize` — полная высота. На сервере рендерятся первые `initialCount`
строк, `pinned` держит индекс в окне при изменении данных, `scrollTo(index)` прокручивает к
строке. `overscan` добавляет строки за краями окна.

`axis: 'x'` считает окно по горизонтали по `scrollLeft` и ширине; в RTL прокрутка идёт от
правого края. `maxSize` держит холст ниже потолка браузера. Тогда `canvasSize` — физическая
высота, `scrollTop` — логическая, а `items[].offset` даёт позицию строки внутри холста.

`createSizeIndex(count, estimate)` хранит измеренные размеры в дереве Фенвика. Передайте его как
`itemSize` и после измерения строки вызовите `set(index, size)`.
