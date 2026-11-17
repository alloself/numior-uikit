# useDirection

`useDirection(anchor)` сообщает, в какую сторону идёт текст там, где стоит элемент `anchor`:
`ltr` или `rtl`. Используйте его в своих компонентах, которые должны отражаться в RTL.

Направление берётся из настроек, затем из ближайшего атрибута `dir` над `anchor`, затем из
атрибута документа. Если его нет нигде, возвращается `ltr`. `provideDirection(dir)` задаёт
направление всему, что внутри компонента, без атрибута `dir`.

## Сигнатура

<SignatureReference :names="['useDirection', 'provideDirection', 'DirectionControl']" />

## Использование

```ts
import { computed, useTemplateRef } from 'vue';
import { useDirection } from '@numior/kit';

const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);
const arrow = computed(() => (direction.isRtl() ? 'arrow-left' : 'arrow-right'));
```

`dir()` и `isRtl()` — функции, а не ref. Вызывайте их внутри `computed` или обработчика, чтобы
получить текущее значение. Что разворачивается в RTL у компонентов Numior UI, описано в
руководстве [RTL](/guide/direction).
