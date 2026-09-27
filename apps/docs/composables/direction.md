# useDirection

`useDirection(anchor)` отвечает, в какую сторону пишет ближайшая область: из конфигурации,
из ближайшего атрибута `dir` над `anchor`, из документа, иначе `ltr`. `provideDirection`
задаёт направление поддереву без атрибута.

## Сигнатура

<SignatureReference :names="['useDirection', 'provideDirection', 'DirectionControl']" />

## Использование

```ts
import { computed, useTemplateRef } from 'vue';
import { useDirection } from '@numior/vue';

const root = useTemplateRef<HTMLElement>('root');
const direction = useDirection(root);
const arrow = computed(() => (direction.isRtl() ? 'arrow-left' : 'arrow-right'));
```

`dir()` и `isRtl()` — функции, а не ref: читайте их внутри `computed` или обработчика, чтобы
значение обновлялось вместе с конфигурацией. Подробнее о зеркалировании — в руководстве
[Направление письма](/guide/direction).
