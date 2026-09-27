# Локализация

Встроенные тексты компонентов — имена кнопок закрытия, пустые состояния, навигация
календаря, подписи пагинации, ошибки загрузки — живут в словаре с русским и английским.
Язык выбирает `locale` конфигурации, приложение переопределяет любой текст, добавляет свой
язык или отдаёт тексты своей i18n-библиотеке. Тексты каждого компонента показывает вкладка
«Тексты» в его API.

<Example name="guide/Locale" />

## Как выбирается текст

1. Проп компонента (`closeLabel`, `emptyLabel`, `pageLabel`) побеждает всегда.
2. Хук `translate` из конфигурации, если вернул строку.
3. Словарь `messages` из конфигурации.
4. Встроенный русский или английский текст.
5. Английский текст.

Тег локали разворачивается от общего к частному: `ru-RU` даёт `en` → `ru` → `ru-RU`, более
точный тег побеждает. Календарь, выбор даты и периода, числовое поле и поле времени берут
тексты на языке своего пропа `locale`, поэтому подписи не расходятся с форматом.

## Переопределить тексты

```ts
createNuiConfig({
  locale: 'ru-RU',
  messages: { ru: { dialog: { close: 'Закрыть окно' } } },
});
```

Меняются только указанные ключи. `messages` принимает значение, ref или геттер; вложенный
`provideNuiConfig({ messages })` добавляет слой для поддерева. Ключи типизированы: опечатка
в пространстве имён или ключе — ошибка TypeScript.

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

Недостающие тексты частичного языка берутся из английского; полный словарь описывает тип
`NuiVueMessages`, формы добавляют `NuiFormsMessages`. Тексты с параметрами — функции одного
объекта; `plural(language, count, forms)` выбирает форму через `Intl.PluralRules` по языку
текста, а не по локали приложения.

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

`translate(key, params, locale)` получает ключ вида `dialog.close`, параметры текста-функции
и язык компонента. Строка побеждает словарь, `undefined` отдаёт слово словарю. В сообщениях
vue-i18n параметры доступны по именам: `pagination: { range: '{from}–{to} из {total}' }`.

## SSR

Каталоги — объекты без побочных эффектов, `Intl.PluralRules` детерминирован, поэтому сервер и
клиент выдают один текст. Подгружаемый словарь загрузите до `mount` и до серверного рендера и
передайте через ref. Неиспользуемые каталоги уходят при tree-shaking: `NuiButton` не тянет
тексты диалога.
