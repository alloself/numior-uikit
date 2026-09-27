# useVirtualList

`useVirtualList(container, options)` рендерит только видимые строки длинного списка: по
`count` и `itemSize` считает диапазон, отступы до и после него и общий размер. Контейнер
остаётся вашим, поэтому строки можно класть в `<tbody>` или любой список.

<Example name="composables/VirtualList" />

## Сигнатура

<SignatureReference :names="['useVirtualList', 'VirtualListOptions', 'VirtualList', 'VirtualItem']" />

## Поведение

`items` — видимые элементы с индексом, началом и размером, `startSize` и `endSize` —
отступы-заполнители, `totalSize` — полная высота. На сервере рендерятся первые `initialCount`
строк, `pinned` держит индекс в окне при изменении данных, `scrollTo(index)` прокручивает к
строке. `overscan` добавляет строки за краями окна.
