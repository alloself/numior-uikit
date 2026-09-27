# Skip link

`NuiSkipLink` — первая ссылка страницы «К содержимому»: невидима, пока не получит фокус с
клавиатуры, и переносит фокус на элемент `target` мимо шапки и навигации.

<Example name="skip-link/Basic" />

## Установка

```ts
import { NuiSkipLink } from '@numior/vue';
import '@numior/vue/styles/skip-link.css';
```

## Поведение

Клик ставит фокус на цель, добавляя ей `tabindex="-1"` при необходимости, и записывает
`#target` в адрес без прыжка страницы. Ставьте ссылку первым элементом `body`, чтобы она
была первой в порядке табуляции.

## Доступность

Ссылка остаётся в дереве доступности и в порядке табуляции всегда; скрыта только визуально.

<KeyboardReference name="NuiSkipLink" />

## API

<ApiReference name="NuiSkipLink" />
