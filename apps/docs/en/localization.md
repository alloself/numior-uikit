# Localization

Built-in component texts — close button names, empty states, calendar navigation,
pagination labels, table announcements, upload errors — come from a dictionary. Russian
and English are built in, and the language follows the configured locale. An app can
override any text, add its own language or hand texts to its i18n library.

## How a text is chosen

Each text resolves in this order:

1. The component prop (`closeLabel`, `emptyLabel`, `pageLabel` …) always wins.
2. The `translate` hook from the configuration, when it returns a string.
3. The `messages` dictionary from the configuration.
4. The built-in Russian or English text.
5. The English text.

The language comes from the configured `locale` (`createNuiConfig({ locale })` for the app,
`provideNuiConfig({ locale })` for a subtree). Without it `en-US` applies; the kit never reads
the browser language, so the server and the first frame agree. The tag expands into a chain
from general to specific: `ru-RU` gives `en` → `ru` → `ru-RU`, and the more specific tag
wins — a `de-AT` override beats `de`. An `en` override is the fallback for every language but
never replaces the built-in Russian.

The calendar, date and range pickers, number field and time field take texts in the
language of their own `locale` prop, so labels never disagree with number and date formats.

## Override texts

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';

createApp(App)
  .use(
    createNuiConfig({
      locale: 'en-US',
      messages: { en: { dialog: { close: 'Dismiss' } } },
    }),
  )
  .mount('#app');
```

Only the given keys change; the rest stay built in. `messages` takes a value, a ref or a
getter. A nested `provideNuiConfig({ messages })` adds a layer for its subtree: for the same
tag the nearer layer wins. Keys are typed, so a typo in a namespace or key is a TypeScript
error.

## Your own language

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

A partial language takes missing texts from English. Type a complete dictionary as
`NuiVueMessages` and TypeScript lists the missing keys.

Parameterised texts are functions of one object: `range: ({ from, to, total }) => …`.
`plural(language, count, forms)` picks a form through `Intl.PluralRules` (`zero`, `one`,
`two`, `few`, `many`, `other`) and falls back to `other`; pass the language the text is
written in, not the app locale.

## vue-i18n and other libraries

```ts
import { createI18n } from 'vue-i18n';
import { createNuiConfig } from '@numior/vue';

const i18n = createI18n({ legacy: false, locale: 'en-US', messages });

createNuiConfig({
  locale: () => i18n.global.locale.value,
  translate: (key, params, locale) =>
    i18n.global.te(`nui.${key}`, locale)
      ? i18n.global.t(`nui.${key}`, params ?? {}, { locale })
      : undefined,
});
```

`translate(key, params, locale)` receives a `namespace.key` key (`dialog.close`,
`pagination.range`), the params object of a function text and the component language. A
returned string wins over the dictionary; `undefined` falls back to it. A nested hook is
asked before the outer one. vue-i18n messages read the params by name:
`nui: { pagination: { range: '{from}–{to} of {total}' } }`.

## SSR and lazy loading

Catalogs are plain side-effect-free objects and `Intl.PluralRules` is deterministic, so the
server and the client produce the same text. Load a lazy dictionary before `mount` and before
the server render, then pass it through a ref. Unused catalogs tree-shake away: `NuiButton`
carries no dialog texts, and the build checks it.

## Reference

Keys are grouped by namespace; ƒ marks a function text, and the examples show its params as
`{from}`, `{label}` and so on.

### alert

| Key       | Prop                    | English | Russian |
| --------- | ----------------------- | ------- | ------- |
| `dismiss` | NuiAlert `dismissLabel` | Close   | Закрыть |

### avatar

| Key       | Prop                    | English | Russian      |
| --------- | ----------------------- | ------- | ------------ |
| `online`  | NuiAvatar `statusLabel` | Online  | В сети       |
| `offline` | NuiAvatar `statusLabel` | Offline | Не в сети    |
| `busy`    | NuiAvatar `statusLabel` | Busy    | Занят        |
| `away`    | NuiAvatar `statusLabel` | Away    | Нет на месте |

### breadcrumbs

| Key     | Prop                       | English    | Russian               |
| ------- | -------------------------- | ---------- | --------------------- |
| `label` | NuiBreadcrumbs `label`     | Breadcrumb | Навигационная цепочка |
| `more`  | NuiBreadcrumbs `moreLabel` | Show path  | Показать путь         |

### calendar

| Key        | Prop            | English        | Russian          |
| ---------- | --------------- | -------------- | ---------------- |
| `previous` | `previousLabel` | Previous month | Предыдущий месяц |
| `next`     | `nextLabel`     | Next month     | Следующий месяц  |
| `month`    | `monthLabel`    | Choose month   | Выбрать месяц    |
| `year`     | `yearLabel`     | Choose year    | Выбрать год      |
| `today`    | `todayLabel`    | Today          | Сегодня          |
| `week`     | `weekLabel`     | Week           | Неделя           |

### chip

| Key      | Prop                  | English | Russian |
| -------- | --------------------- | ------- | ------- |
| `remove` | NuiChip `removeLabel` | Remove  | Убрать  |

### combobox

| Key      | Prop                      | English      | Russian           |
| -------- | ------------------------- | ------------ | ----------------- |
| `empty`  | NuiCombobox `emptyLabel`  | No matches   | Ничего не найдено |
| `clear`  | NuiCombobox `clearLabel`  | Clear        | Очистить          |
| `remove` | NuiCombobox `removeLabel` | Remove       | Убрать            |
| `toggle` | NuiCombobox `toggleLabel` | Show options | Показать варианты |

### datePicker

| Key          | Prop                           | English      | Russian        |
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

| Key     | Prop                                          | English | Russian |
| ------- | --------------------------------------------- | ------- | ------- |
| `close` | NuiDialog, NuiDrawer, NuiSidebar `closeLabel` | Close   | Закрыть |

### list

| Key       | Prop                                | English  | Russian     |
| --------- | ----------------------------------- | -------- | ----------- |
| `loading` | NuiList, NuiCombobox `loadingLabel` | Loading  | Загрузка    |
| `empty`   | NuiList `emptyLabel`                | No items | Список пуст |

### numberField

| Key         | Prop             | English   | Russian   |
| ----------- | ---------------- | --------- | --------- |
| `increment` | `incrementLabel` | Increment | Увеличить |
| `decrement` | `decrementLabel` | Decrement | Уменьшить |

### pagination

| Key        | Prop            | English                | Russian                |
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

| Key       | Prop         | English    | Russian       |
| --------- | ------------ | ---------- | ------------- |
| `empty`   | `emptyLabel` | No options | Нет вариантов |
| `clear`   | `clearLabel` | Clear      | Очистить      |
| `count` ƒ | `countLabel` | 2 selected | Выбрано: 2    |

### sidebar

| Key      | Prop                      | English        | Russian                    |
| -------- | ------------------------- | -------------- | -------------------------- |
| `label`  | NuiSidebar `label`        | Navigation     | Навигация                  |
| `toggle` | NuiSidebarTrigger `label` | Toggle sidebar | Переключить боковую панель |

### table

| Key          | Prop             | English                                                                                        | Russian                                                                                         |
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

| Key     | Prop                                                 | English     | Russian                |
| ------- | ---------------------------------------------------- | ----------- | ---------------------- |
| `clock` | NuiTimeField `clockLabel`, NuiDatePicker `timeLabel` | Choose time | Выбрать время          |
| `empty` | `emptyLabel`                                         | No times    | Нет доступного времени |

### toast

| Key     | Prop                              | English       | Russian     |
| ------- | --------------------------------- | ------------- | ----------- |
| `close` | NuiToast, NuiToaster `closeLabel` | Close         | Закрыть     |
| `label` | NuiToaster `label`                | Notifications | Уведомления |

### upload

| Key            | Prop          | English               | Russian                    |
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
