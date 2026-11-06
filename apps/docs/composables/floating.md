# useFloating

`useFloating(reference, floating, options)` ставит всплывающий элемент рядом с опорным,
например список вариантов под полем. Положение пересчитывается при прокрутке и изменении
размеров.

`placement` задаёт сторону и выравнивание, например `bottom-start`, а `offset` — расстояние в
пикселях. Если места не хватает, элемент переходит на противоположную сторону. `arrow` — элемент
стрелки, композабл ставит её напротив опорного элемента.

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

`size.matchWidth` делает элемент не уже опорного, а `size.fitHeight` ограничивает его высоту
свободным местом в окне. `size.fitWidth` так же ограничивает ширину, а `maxBlockSize` и
`maxInlineSize` задают потолок в пикселях. `enabled` включает расчёт, пока элемент открыт.

По умолчанию элемент стоит с `position: fixed`, поэтому родитель с `overflow: hidden` его не
обрезает. `strategy: 'absolute'` ставит `position: absolute`.
