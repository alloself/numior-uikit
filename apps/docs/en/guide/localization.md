# Localization

The built-in component texts, close button names, empty states, calendar navigation,
pagination labels and upload errors, live in a dictionary with Russian and English. The
configuration `locale` picks the language, and the app overrides any text, adds its own
language or hands the texts to its i18n library. The "Texts" tab in a component's API lists
its texts.

<Example name="guide/Locale" />

## How a text is chosen

1. A component prop (`closeLabel`, `emptyLabel`, `pageLabel`) always wins.
2. The `translate` hook from the configuration, when it returns a string.
3. The `messages` dictionary from the configuration.
4. The built-in Russian or English text.
5. The English text.

A locale tag unfolds from general to specific: `ru-RU` gives `en` → `ru` → `ru-RU`, and the
more specific tag wins. The calendar, the date pickers, number field and time field take texts in the language of
their own `locale` prop. Labels never diverge from the format.

## Override texts

```ts
import { createNuiConfig, type NuiLocaleMessages, type NuiVueMessages } from '@numior/vue';
import type { NuiFormsMessages } from '@numior/forms';

const messages: NuiLocaleMessages<NuiVueMessages & NuiFormsMessages> = {
  en: { dialog: { close: 'Close window' } },
};

createNuiConfig({ locale: 'en-US', messages });
```

Only the given keys change. `messages` takes a value, a ref or a getter; a nested
`provideNuiConfig({ messages })` adds a layer for a subtree.

The dictionary of every package is a plain exported type: `NuiVueMessages`, `NuiFormsMessages`,
`NuiTablePackageMessages` and others. The app lists the packages it uses in
`NuiLocaleMessages<...>`, and a typo in a namespace, a key or a text kind becomes a TypeScript
error.

## Own language

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

Missing texts of a partial language come from English; the `NuiVueMessages` type describes the
full kit dictionary, the other packages have their own types. Texts with parameters are functions of
one object. `plural(language, count, forms)` picks the form through `Intl.PluralRules` by the
language of the text, not the app locale.

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

`translate(key, params, locale)` receives a key such as `dialog.close`, the parameters of a
text function and the component language. A string beats the dictionary, `undefined` hands
the word to the dictionary. In vue-i18n messages the parameters are available by name:
`pagination: { range: '{from}–{to} of {total}' }`.

## SSR

The catalogs are objects without side effects and `Intl.PluralRules` is deterministic, so the
server and the client produce the same text. Load a lazy dictionary before `mount` and before
the server render and pass it through a ref. Unused catalogs are tree-shaken: `NuiButton` does
not pull the dialog texts.
