# Localization

How to pick the language of built-in labels, replace them with your own, add a new language or
connect vue-i18n.

<Example name="guide/Locale" />

Components have built-in labels: "Close" on a dialog, "No data" in an empty list, month names
in the calendar, pagination texts and file upload errors. They exist in Russian and English, and
the `locale` option in the settings picks the language. The labels of a component are listed on
the Texts tab of its API.

## Where a label comes from

A component looks for a label in this order:

1. A component prop, for example `closeLabel`, `emptyLabel` or `pageLabel`.
2. The `translate` function from the settings, when it returns a string.
3. The `messages` dictionary from the settings.
4. The built-in Russian or English text.
5. The English text.

For `locale: 'ru-RU'` a component starts from the English texts and puts the Russian ones (`ru`)
on top. The texts for `ru-RU`, if you set them, go on top of those.

The calendar, date and range pickers, number field and time field take labels in the language
of their own `locale` prop. So month names and the date format are always in one language.

## Your own texts

Pass to `messages` only the texts you want to replace:

```ts
import { createNuiConfig, type NuiLocaleMessages, type NuiVueMessages } from '@numior/vue';
import type { NuiFormsMessages } from '@numior/forms';

const messages: NuiLocaleMessages<NuiVueMessages & NuiFormsMessages> = {
  en: { dialog: { close: 'Close window' } },
};

createNuiConfig({ locale: 'en-US', messages });
```

The other labels stay built in. `messages` takes a value, a ref or a getter, and
`provideNuiConfig({ messages })` replaces texts only inside one component.

Every package has a dictionary type: `NuiVueMessages`, `NuiFormsMessages`,
`NuiTablePackageMessages` and others. List the packages you use in `NuiLocaleMessages<...>`, and
TypeScript flags a typo in a section name or key.

## New language

Add a section with the language code to `messages` and set that language in `locale`:

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

Labels you have not translated stay in English. The `NuiVueMessages` type describes the full list
of labels, and other packages have their own types.

A label with a number or other data is a function that receives an object of parameters.
`plural(language, count, forms)` picks the word form for a number by the rules of `language`.

## vue-i18n and other libraries

Pass `translate` a function that takes the text from your translation library:

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

`translate` receives a key such as `dialog.close`, the label parameters and the component
language. When the function returns `undefined`, the component takes the label from the
dictionary.

In vue-i18n messages the parameters are available by name:
`pagination: { range: '{from}–{to} of {total}' }`.

## SSR

The server and the browser render the same labels, with nothing extra to set up. If a dictionary
loads over the network, wait for it before the server render and before `mount`, and pass it
through a ref.

Only the labels of components you import end up in the bundle: `NuiButton` does not load the
dialog texts.
