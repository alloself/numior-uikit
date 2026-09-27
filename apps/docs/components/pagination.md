# Pagination

`NuiPagination` — `<nav>` с кнопками страниц: границы, соседи текущей и многоточия между ними,
«назад» и «вперёд». Рядом — строка диапазона и, если задан `pageSizes`, выбор размера
страницы.

<Example name="pagination/Basic" />

## Установка

```ts
import { NuiPagination } from '@numior/vue';
import '@numior/vue/styles/pagination.css';
```

## Использование

<Configurator name="NuiPagination" />

## Примеры

### Ссылки вместо кнопок

`href(page)` превращает кнопки в ссылки для роутера и SEO, `edges` добавляет «в начало» и
«в конец».

<Example name="pagination/Links" />

### Узкий контейнер

Компактный режим включается по ширине самого компонента: остаются «назад», статус «4 / 12»
и «вперёд».

<Example name="pagination/Compact" />

## Поведение

`siblings` и `boundaries` задают, сколько страниц видно вокруг текущей и у краёв. Страница
всегда зажата в допустимый диапазон, при смене размера страницы текущая пересчитывается.

## Доступность

`<nav aria-label>` со списком; текущая страница помечена `aria-current="page"`, у каждой кнопки
имя из `pageLabel`, у стрелок — из словаря. Недоступные стрелки отключены, в RTL зеркалятся.

<KeyboardReference name="NuiPagination" />

## API

<ApiReference name="NuiPagination" />
