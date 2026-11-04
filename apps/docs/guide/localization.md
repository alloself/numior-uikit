# Локализация

Как выбрать язык встроенных подписей, заменить их своими, добавить новый язык или подключить
vue-i18n.

<Example name="guide/Locale" />

У компонентов есть встроенные подписи: «Закрыть» у диалога, «Нет данных» в пустом списке,
названия месяцев в календаре, тексты пагинации и ошибки загрузки файлов. Они написаны на русском
и английском, язык выбирает опция `locale` в настройках. Подписи конкретного компонента
перечислены на вкладке «Тексты» в его API.

## Откуда берётся подпись

Компонент ищет подпись в таком порядке:

1. Свойство компонента, например `closeLabel`, `emptyLabel` или `pageLabel`.
2. Функция `translate` из настроек, если она вернула строку.
3. Словарь `messages` из настроек.
4. Встроенный русский или английский текст.
5. Английский текст.

Для `locale: 'ru-RU'` компонент берёт английские тексты и заменяет их русскими (`ru`). Тексты
для `ru-RU`, если вы их задали, заменяют и русские.

Календарь, выбор даты и периода, числовое поле и поле времени берут подписи на языке своего
свойства `locale`. Поэтому названия месяцев и формат даты всегда на одном языке.

## Свои тексты

Передайте в `messages` только те тексты, которые хотите заменить:

```ts
import { createNuiConfig, type NuiLocaleMessages, type NuiVueMessages } from '@numior/vue';
import type { NuiFormsMessages } from '@numior/forms';

const messages: NuiLocaleMessages<NuiVueMessages & NuiFormsMessages> = {
  ru: { dialog: { close: 'Закрыть окно' } },
};

createNuiConfig({ locale: 'ru-RU', messages });
```

Остальные подписи останутся встроенными. `messages` принимает значение, ref или геттер, а
`provideNuiConfig({ messages })` заменяет тексты только внутри одного компонента.

У каждого пакета есть тип словаря: `NuiVueMessages`, `NuiFormsMessages`,
`NuiTablePackageMessages` и другие. Перечислите в `NuiLocaleMessages<...>` пакеты, которые вы
используете, и TypeScript подсветит опечатку в имени раздела или ключа.

## Новый язык

Добавьте в `messages` раздел с кодом языка и укажите этот язык в `locale`:

```ts
import { createNuiConfig, plural, type NuiLocaleMessages, type NuiVueMessages } from '@numior/vue';

const messages: NuiLocaleMessages<NuiVueMessages> = {
  de: {
    numberField: { increment: 'Erhöhen', decrement: 'Verringern' },
    upload: {
      moreThan: ({ count }) =>
        `Mehr als ${count} ${plural('de', count, { one: 'Datei', other: 'Dateien' })}`,
    },
  },
};

createNuiConfig({ locale: 'de-DE', messages });
```

Подписи, которые вы не перевели, останутся на английском. Полный список подписей описывает тип
`NuiVueMessages`, у других пакетов — свои типы.

Подпись с числом или другими данными задаётся функцией, которая получает объект параметров.
`plural(language, count, forms)` выбирает форму слова по числу, по правилам языка `language`.

## vue-i18n и другие библиотеки

Передайте в `translate` функцию, которая берёт текст из вашей библиотеки переводов:

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

`translate` получает ключ вида `dialog.close`, параметры подписи и язык компонента. Если функция
вернула `undefined`, компонент возьмёт подпись из словаря.

Параметры доступны в сообщениях vue-i18n по именам:
`pagination: { range: '{from}–{to} из {total}' }`.

## SSR

Сервер и браузер выводят одни и те же подписи, отдельно настраивать ничего не нужно. Если словарь
загружается по сети, дождитесь его до рендера на сервере и до `mount` и передайте через ref.

В сборку попадают только подписи компонентов, которые вы импортировали: с `NuiButton` тексты
диалога не загружаются.
