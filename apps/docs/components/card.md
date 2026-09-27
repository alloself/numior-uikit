# Карточка

`NuiCard` — контейнер на поверхности, собранный из частей: шапка, заголовок, описание, содержимое,
подвал и медиа. Карточка целиком может быть ссылкой или кнопкой.

<Example name="card/Basic" />

## Установка

```ts
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/vue';
import '@numior/vue/styles/card.css';
```

## Использование

<Configurator name="NuiCard" />

## Анатомия

| Часть                | Роль                                                           |
| -------------------- | -------------------------------------------------------------- |
| `NuiCard`            | Поверхность, отступ и режим ссылки или кнопки                  |
| `NuiCardHeader`      | Заголовок с описанием и слот `actions` справа                  |
| `NuiCardTitle`       | Заголовок; в интерактивной карточке держит единственную ссылку |
| `NuiCardDescription` | Подзаголовок приглушённым цветом                               |
| `NuiCardContent`     | Основное содержимое                                            |
| `NuiCardFooter`      | Действия внизу                                                 |
| `NuiCardMedia`       | Картинка в обрез до края с заданным соотношением сторон        |

## Примеры

### Медиа

`NuiCardMedia` растягивает картинку до края карточки; `aspect` задаёт соотношение сторон.

<Example name="card/Media" />

### Карточка-ссылка

`href` делает всю карточку ссылкой. Кнопка в `actions` и подвал работают отдельно от неё.

<Example name="card/Link" />

### Интерактивная карточка

`interactive` превращает карточку в кнопку; клик по любому месту приходит в `@click`.

<Example name="card/Interactive" />

### Варианты и отступы

`variant` выбирает контур, тень или мягкую заливку, `padding` — отступ всех частей.

<Example name="card/Variants" />

### Шапка из пропов

`title` и `description` рисуют шапку без частей.

<Example name="card/Props" />

## Доступность

Интерактивная карточка не оборачивается в `<a>` целиком: её именем стал бы весь текст, а вложенные
кнопки стали бы невалидными. Вместо этого заголовок держит единственную ссылку или кнопку и
растягивает её на всю карточку, поэтому такой карточке нужен `NuiCardTitle` или `title`.
Кольцо фокуса рисуется вокруг всей карточки.

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
