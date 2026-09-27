# Breadcrumbs

`NuiBreadcrumbs` — `<nav>` с упорядоченным списком ссылок, где последний элемент помечен
`aria-current="page"`. Разделитель — иконка из реестра, зеркалится в RTL.

<Example name="breadcrumbs/Basic" />

## Установка

```ts
import { NuiBreadcrumbs } from '@numior/vue';
import '@numior/vue/styles/link.css';
import '@numior/vue/styles/breadcrumbs.css';
```

## Примеры

### Длинный путь

`maxItems` сворачивает середину пути в кнопку «…», которая открывает меню со скрытыми
ссылками.

<Example name="breadcrumbs/Collapsed" />

### Своя крошка

Слот `item` получает `item`, `index` и `current` и заменяет стандартную ссылку; разделители и
сворачивание остаются за компонентом.

<Example name="breadcrumbs/Custom" />

## Доступность

Ориентир `<nav aria-label>` и список `<ol>` дают структуру пути; текущая страница — не ссылка.
Ссылки выше 24px, как требует WCAG 2.5.8 для отдельно стоящих целей. Для роутера передайте `as`
и `to` в элементах — они дойдут и до ссылок в меню «…».

<KeyboardReference name="NuiBreadcrumbs" />

## API

<ApiReference name="NuiBreadcrumbs" />
