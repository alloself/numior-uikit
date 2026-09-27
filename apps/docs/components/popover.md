# Popover

`NuiPopover` строится на Popover API: контент получает `popover="auto"`, триггер —
`popovertarget`. Браузер открывает слой в top layer, закрывает по Esc и клику вне, ставит
контент сразу после триггера в порядке Tab.

<Example name="popover/Basic" />

## Установка

```ts
import { NuiPopover } from '@numior/vue';
import '@numior/vue/styles/popover.css';
```

## Примеры

### Размещение

`placement` задаёт сторону и выравнивание; слой переворачивается и сдвигается, когда не
помещается. `offset` — расстояние до триггера.

<Example name="popover/Placement" />

## Доступность

Слот `trigger` отдаёт `attrs` с `popovertarget`, `aria-expanded` и `aria-controls`; свяжите их
через `v-bind` с любой кнопкой. Контент остаётся в DOM рядом с триггером, поэтому наследует
тему и `dir` и не зависит от `overflow` предков.

<KeyboardReference name="NuiPopover" />

## API

<ApiReference name="NuiPopover" />
