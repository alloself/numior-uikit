# Button

Кнопка для действий на странице.

<Example name="button/Basic" />

## Установка

```ts
import { NuiButton } from '@numior/vue';
import '@numior/vue/styles/button.css';
```

## Использование

Подберите вид, цвет и размер кнопки.

<Configurator name="NuiButton" />

## Примеры

### Показать загрузку

Включите `loading`, пока идёт запрос.

<Example name="button/Loading" />

Ширина кнопки не меняется, и фокус остаётся на ней.

### Добавить иконку

Передайте имя иконки в `icon` или `iconEnd`.

<Example name="button/WithIcon" />

### Оставить только иконку

Подпишите кнопку без текста через `aria-label`.

<Example name="button/IconOnly" />

Кнопке внутри поля, например «Показать пароль», задайте `variant="plain"`: у неё нет фона.

### Вписать кнопку в текст

Задайте `size="inline"`, и кнопка возьмёт размер у текста вокруг.

<Example name="button/Inline" />

### Сделать кнопку ссылкой

Передайте `href` или `to`; ссылку в тексте оформляйте через [Link](/components/link).

<Example name="button/Link" />

## Доступность

Кнопка остаётся нативным `<button>`, а ссылка — `<a>`, поэтому клавиатура и экранные дикторы
работают с ними как обычно. Во время загрузки кнопка получает `aria-busy` и не выпадает из
порядка табуляции.

<KeyboardReference name="NuiButton" />

## API

<ApiReference name="NuiButton" />
