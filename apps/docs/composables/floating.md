# useFloating

`useFloating(reference, floating, options)` располагает плавающий элемент рядом с опорным.
Он берёт сторону и выравнивание из `placement`, отступ `offset`, стрелку, переворот при
нехватке места и ширину по опоре. Результат пишется прямо в стили элемента, без реактивного состояния.

## Сигнатура

<SignatureReference :names="['useFloating', 'FloatingOptions']" />

## Использование

```ts
import { useFloating } from '@numior/vue';

useFloating(trigger, panel, {
  placement: 'bottom-start',
  offset: 8,
  size: { matchWidth: true, fitHeight: true },
  enabled: () => open.value,
});
```

`strategy: 'fixed'` нужен внутри `overflow: hidden`; в top layer нативные поповеры и диалоги
позиционируются так же. Сторона раскрытия доступна CSS через приватные переменные, из
которых компоненты kit выводят анимацию и положение стрелки.
