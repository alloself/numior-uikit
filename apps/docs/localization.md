# Локализация

Встроенные тексты компонентов — имена кнопок закрытия, пустые состояния, навигация
календаря, подписи пагинации, объявления таблицы, ошибки загрузки — берутся из словаря.
Русский и английский встроены, язык выбирается по локали конфигурации. Приложение может
переопределить любой текст, добавить свой язык или отдать тексты своей i18n-библиотеке.

## Как выбирается текст

Для каждого текста порядок такой:

1. Проп компонента (`closeLabel`, `emptyLabel`, `pageLabel` …) — всегда побеждает.
2. Хук `translate` из конфигурации, если он вернул строку.
3. Словарь `messages` из конфигурации.
4. Встроенный русский или английский текст.
5. Английский текст.

Язык берётся из `locale` конфигурации (`createNuiConfig({ locale })` для приложения,
`provideNuiConfig({ locale })` для поддерева). Без неё действует `en-US`; язык браузера кит не
читает, поэтому сервер и первый кадр совпадают. Тег разворачивается в цепочку от общего к
частному: `ru-RU` даёт `en` → `ru` → `ru-RU`, и более точный тег побеждает — переопределение
`de-AT` сильнее `de`. Переопределение `en` служит запасным текстом для всех языков, но не
перекрывает встроенный русский.

Календарь, выбор даты и периода, числовое поле и поле времени берут тексты на языке своего
пропа `locale`, поэтому подписи не расходятся с форматом чисел и дат.

## Переопределить тексты

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';

createApp(App)
  .use(
    createNuiConfig({
      locale: 'ru-RU',
      messages: { ru: { dialog: { close: 'Закрыть окно' } } },
    }),
  )
  .mount('#app');
```

Меняются только указанные ключи, остальные остаются встроенными. `messages` принимает
значение, ref или геттер. Вложенный `provideNuiConfig({ messages })` добавляет слой для
поддерева: для одного тега ближний слой побеждает. Ключи типизированы: опечатка в
пространстве имён или ключе — ошибка TypeScript.

## Свой язык

```ts
import { createNuiConfig, plural } from '@numior/vue';

createNuiConfig({
  locale: 'de-DE',
  messages: {
    de: {
      numberField: { increment: 'Erhöhen', decrement: 'Verringern' },
      upload: {
        moreThan: ({ count }) =>
          `Mehr als ${count} ${plural('de', count, { one: 'Datei', other: 'Dateien' })}`,
      },
    },
  },
});
```

Частичный язык берёт недостающие тексты из английского. Полный словарь удобно описать
типом `NuiVueMessages` — TypeScript покажет пропущенные ключи.

Тексты с параметрами — функции одного объекта: `range: ({ from, to, total }) => …`.
`plural(language, count, forms)` выбирает форму через `Intl.PluralRules` (`zero`, `one`,
`two`, `few`, `many`, `other`) и падает на `other`; язык передаётся тот, на котором написан
текст, а не локаль приложения.

## vue-i18n и другие библиотеки

```ts
import { createI18n } from 'vue-i18n';
import { createNuiConfig } from '@numior/vue';

const i18n = createI18n({ legacy: false, locale: 'ru-RU', messages });

createNuiConfig({
  locale: () => i18n.global.locale.value,
  translate: (key, params, locale) =>
    i18n.global.te(`nui.${key}`, locale)
      ? i18n.global.t(`nui.${key}`, params ?? {}, { locale })
      : undefined,
});
```

`translate(key, params, locale)` получает ключ вида `namespace.key` (`dialog.close`,
`pagination.range`), объект параметров текста-функции и язык компонента. Вернёт строку —
она побеждает словарь; вернёт `undefined` — текст берётся из словаря. Вложенный хук
спрашивается раньше внешнего. В сообщениях vue-i18n параметры доступны по именам:
`nui: { pagination: { range: '{from}–{to} из {total}' } }`.

## SSR и ленивая загрузка

Каталоги — обычные объекты без побочных эффектов, `Intl.PluralRules` детерминирован, поэтому
сервер и клиент выдают один и тот же текст. Подгружаемый словарь загрузите до `mount` и до
серверного рендера, затем передайте через ref. Неиспользуемые каталоги уходят при
tree-shaking: `NuiButton` не тянет тексты диалога, это проверяет сборка.

## Справочник

Ключи сгруппированы по пространствам имён; ƒ — текст-функция, в примерах параметры
подставлены как `{from}`, `{label}` и т. п.

### alert

| Ключ      | Проп                    | English | Русский |
| --------- | ----------------------- | ------- | ------- |
| `dismiss` | NuiAlert `dismissLabel` | Close   | Закрыть |

### avatar

| Ключ      | Проп                    | English | Русский      |
| --------- | ----------------------- | ------- | ------------ |
| `online`  | NuiAvatar `statusLabel` | Online  | В сети       |
| `offline` | NuiAvatar `statusLabel` | Offline | Не в сети    |
| `busy`    | NuiAvatar `statusLabel` | Busy    | Занят        |
| `away`    | NuiAvatar `statusLabel` | Away    | Нет на месте |

### breadcrumbs

| Ключ    | Проп                       | English    | Русский               |
| ------- | -------------------------- | ---------- | --------------------- |
| `label` | NuiBreadcrumbs `label`     | Breadcrumb | Навигационная цепочка |
| `more`  | NuiBreadcrumbs `moreLabel` | Show path  | Показать путь         |

### calendar

| Ключ       | Проп            | English        | Русский          |
| ---------- | --------------- | -------------- | ---------------- |
| `previous` | `previousLabel` | Previous month | Предыдущий месяц |
| `next`     | `nextLabel`     | Next month     | Следующий месяц  |
| `month`    | `monthLabel`    | Choose month   | Выбрать месяц    |
| `year`     | `yearLabel`     | Choose year    | Выбрать год      |
| `today`    | `todayLabel`    | Today          | Сегодня          |
| `week`     | `weekLabel`     | Week           | Неделя           |

### chip

| Ключ     | Проп                  | English | Русский |
| -------- | --------------------- | ------- | ------- |
| `remove` | NuiChip `removeLabel` | Remove  | Убрать  |

### combobox

| Ключ     | Проп                      | English      | Русский           |
| -------- | ------------------------- | ------------ | ----------------- |
| `empty`  | NuiCombobox `emptyLabel`  | No matches   | Ничего не найдено |
| `clear`  | NuiCombobox `clearLabel`  | Clear        | Очистить          |
| `remove` | NuiCombobox `removeLabel` | Remove       | Убрать            |
| `toggle` | NuiCombobox `toggleLabel` | Show options | Показать варианты |

### datePicker

| Ключ         | Проп                           | English      | Русский        |
| ------------ | ------------------------------ | ------------ | -------------- |
| `open`       | NuiDatePicker `openLabel`      | Choose date  | Выбрать дату   |
| `openRange`  | NuiDateRangePicker `openLabel` | Choose dates | Выбрать период |
| `clear`      | `clearLabel`                   | Clear        | Очистить       |
| `dialog`     | `dialogLabel`                  | Calendar     | Календарь      |
| `end`        | NuiDateRangePicker `endLabel`  | End date     | Дата окончания |
| `yearGlyph`  | `placeholder`                  | Y            | Г              |
| `monthGlyph` | `placeholder`                  | M            | М              |
| `dayGlyph`   | `placeholder`                  | D            | Д              |
| `timeGlyphs` | `placeholder`                  | HH:mm        | ЧЧ:ММ          |

### dialog

| Ключ    | Проп                                          | English | Русский |
| ------- | --------------------------------------------- | ------- | ------- |
| `close` | NuiDialog, NuiDrawer, NuiSidebar `closeLabel` | Close   | Закрыть |

### list

| Ключ      | Проп                                | English  | Русский     |
| --------- | ----------------------------------- | -------- | ----------- |
| `loading` | NuiList, NuiCombobox `loadingLabel` | Loading  | Загрузка    |
| `empty`   | NuiList `emptyLabel`                | No items | Список пуст |

### numberField

| Ключ        | Проп             | English   | Русский   |
| ----------- | ---------------- | --------- | --------- |
| `increment` | `incrementLabel` | Increment | Увеличить |
| `decrement` | `decrementLabel` | Decrement | Уменьшить |

### pagination

| Ключ       | Проп            | English                | Русский                |
| ---------- | --------------- | ---------------------- | ---------------------- |
| `label`    | `label`         | Pagination             | Постраничная навигация |
| `previous` | `previousLabel` | Previous page          | Предыдущая страница    |
| `next`     | `nextLabel`     | Next page              | Следующая страница     |
| `first`    | `firstLabel`    | First page             | Первая страница        |
| `last`     | `lastLabel`     | Last page              | Последняя страница     |
| `pageSize` | `pageSizeLabel` | Rows per page          | Строк на странице      |
| `page` ƒ   | `pageLabel`     | Page {page}            | Страница {page}        |
| `range` ƒ  | `rangeLabel`    | {from}–{to} of {total} | {from}–{to} из {total} |

### select

| Ключ      | Проп         | English    | Русский       |
| --------- | ------------ | ---------- | ------------- |
| `empty`   | `emptyLabel` | No options | Нет вариантов |
| `clear`   | `clearLabel` | Clear      | Очистить      |
| `count` ƒ | `countLabel` | 2 selected | Выбрано: 2    |

### sidebar

| Ключ     | Проп                      | English        | Русский                    |
| -------- | ------------------------- | -------------- | -------------------------- |
| `label`  | NuiSidebar `label`        | Navigation     | Навигация                  |
| `toggle` | NuiSidebarTrigger `label` | Toggle sidebar | Переключить боковую панель |

### table

| Ключ         | Проп             | English                                                                                        | Русский                                                                                         |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `empty`      | `emptyLabel`     | No data                                                                                        | Нет данных                                                                                      |
| `select`     | `selectLabel`    | Select row                                                                                     | Выбрать строку                                                                                  |
| `selectAll`  | `selectAllLabel` | Select all rows                                                                                | Выбрать все строки                                                                              |
| `expand`     | `expandLabel`    | Toggle row                                                                                     | Развернуть строку                                                                               |
| `drag`       | `dragLabel`      | Reorder row                                                                                    | Переставить строку                                                                              |
| `resize` ƒ   | `resizeLabel`    | Resize {label}                                                                                 | Ширина колонки {label}                                                                          |
| `reorder` ƒ  | `reorderLabel`   | Reorder {label}                                                                                | Переставить колонку {label}                                                                     |
| `announce` ƒ | `announce`       | {label} grabbed, position 2 of 4. Use the arrow keys to move, Space to drop, Escape to cancel. | Колонка «{label}» взята, позиция 2 из 4. Стрелки перемещают, Пробел отпускает, Escape отменяет. |

### timeField

| Ключ    | Проп                                                 | English     | Русский                |
| ------- | ---------------------------------------------------- | ----------- | ---------------------- |
| `clock` | NuiTimeField `clockLabel`, NuiDatePicker `timeLabel` | Choose time | Выбрать время          |
| `empty` | `emptyLabel`                                         | No times    | Нет доступного времени |

### toast

| Ключ    | Проп                              | English       | Русский     |
| ------- | --------------------------------- | ------------- | ----------- |
| `close` | NuiToast, NuiToaster `closeLabel` | Close         | Закрыть     |
| `label` | NuiToaster `label`                | Notifications | Уведомления |

### upload

| Ключ           | Проп          | English               | Русский                    |
| -------------- | ------------- | --------------------- | -------------------------- |
| `drop`         | `dropLabel`   | Drop files here       | Перетащите файлы сюда      |
| `browse`       | `browseLabel` | Choose files          | Выбрать файлы              |
| `cancel`       | `cancelLabel` | Cancel upload         | Отменить загрузку          |
| `retry`        | `retryLabel`  | Retry                 | Повторить                  |
| `remove`       | `removeLabel` | Remove                | Удалить                    |
| `done`         | `doneLabel`   | Uploaded              | Загружено                  |
| `typeError`    | `errorLabel`  | Unsupported file type | Неподдерживаемый тип файла |
| `tooLarge`     | `errorLabel`  | File is too large     | Файл слишком большой       |
| `largerThan` ƒ | `errorLabel`  | Larger than {size}    | Файл больше {size}         |
| `tooMany`      | `errorLabel`  | Too many files        | Слишком много файлов       |
| `moreThan` ƒ   | `errorLabel`  | More than 3 files     | Не больше 3 файлов         |
| `rejected`     | `errorLabel`  | File rejected         | Файл отклонён              |
| `failed`       | `errorLabel`  | Upload failed         | Не удалось загрузить       |
