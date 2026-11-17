# Вывод документа

Готовый документ выводится без редактора, теми же стилями.

<Example name="content/Basic" />

На сервере `NuiContent` отдаёт готовый HTML, и страница показывает документ ещё до загрузки
скриптов.

## Установка

```ts install:packages
import { NuiContent } from '@numior/kit/content';
import { fromHTML } from '@numior/kit/editor-core';
```

Документ принимается в том виде, в каком его хранит редактор с `format="json"`. Перед выводом JSON
проверяется по схеме, а ошибки приходят в событии `invalid`.

## Показать таблицы, код и медиа

Передайте в `views` компоненты для таблиц, блоков кода и медиа.

<Example name="content/Views" />

Таблица выводится так же, как в редакторе, с сортировкой и фильтрами автора. Для неё подключите
`@numior/kit/table/styles.css`.

Вид картинки открывает её на весь экран по клику. Видео выводится окном, если его сервис
перечислен в `embeds`, а без вида встраивания остаётся ссылкой.

Виды лежат в отдельных точках входа: `@numior/kit/content/table`, `@numior/kit/content/code` и
`@numior/kit/content/media`. Импортируйте только нужные, и код остальных на страницу не попадёт.

## Из HTML в документ

Прочитайте старые описания в HTML через `fromHTML`:

```ts
import { contentSchema } from '@numior/kit/content';
import { fromHTML, toJSON } from '@numior/kit/editor-core';

const document = toJSON(fromHTML(contentSchema, product.descriptionHtml));
```

Теги, которых нет в схеме, снимаются, а их текст остаётся. Скрипты, обработчики событий и ссылки
`javascript:` в документ не попадают.

`renderContent(doc)` собирает из документа строку HTML, например для письма или RSS. Это тот же
серверный рендер `NuiContent`, поэтому функция асинхронная, а иконки приходят в HTML готовым
`<svg>`. Свои иконки передайте в `icons`: ключ — имя иконки, значение — компонент.

```ts
import { renderContent } from '@numior/kit/content';

const html = await renderContent(doc, { size: 'lg' });
```

Странице с этим HTML нужны стили контента и `@numior/kit/styles/icon.css`.

## API

<ApiReference name="NuiContent" />
