# Card

Рамка для одного предмета, например заказа или клиента.

<Example name="card/Basic" />

## Установка

```ts install
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/vue';
```

## Использование

Поменяйте вид и отступы.

<Configurator name="NuiCard" />

## Анатомия

| Часть                | Что внутри                                       |
| -------------------- | ------------------------------------------------ |
| `NuiCard`            | Рамка с отступами, ссылка или кнопка             |
| `NuiCardHeader`      | Заголовок с описанием и кнопки в слоте `actions` |
| `NuiCardTitle`       | Заголовок, по умолчанию `<h3>`                   |
| `NuiCardDescription` | Приглушённая строка под заголовком               |
| `NuiCardContent`     | Основной текст                                   |
| `NuiCardFooter`      | Кнопки внизу                                     |
| `NuiCardMedia`       | Картинка от края до края                         |

## Примеры

### Добавить картинку

Положите `NuiCardMedia` первой частью и задайте `aspect`.

<Example name="card/Media" />

### Сделать карточку ссылкой

Передайте `href` или `to`.

<Example name="card/Link" />

Кнопки внутри карточки нажимаются отдельно и ссылку не открывают.

### Сделать карточку кнопкой

Добавьте `interactive` и слушайте `click`.

<Example name="card/Interactive" />

### Показать загрузку

Добавьте `loading`.

<Example name="card/Loading" />

Шапка не меняет высоту, когда приходят данные. Заглушкам нужны стили
`@numior/vue/styles/skeleton.css`.

### Шапка без частей

Передайте `title` и `description`.

<Example name="card/Props" />

## Доступность

Карточке-ссылке и карточке-кнопке нужен заголовок: `NuiCardTitle` или свойство `title`.
Экранный диктор называет ссылку или кнопку по этому заголовку, а не по всему тексту карточки.
Рамка фокуса обводит карточку целиком.

Карточка с `loading` помечена `aria-busy`: диктор узнаёт, что её содержимое ещё загружается.

<KeyboardReference name="NuiCard" />

## API

<ApiReference
  :names="[
    'NuiCard',
    'NuiCardHeader',
    'NuiCardTitle',
    'NuiCardDescription',
    'NuiCardContent',
    'NuiCardFooter',
    'NuiCardMedia',
  ]"
/>
