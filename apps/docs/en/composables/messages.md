# useMessages

`useMessages(catalog, locale)` returns the labels of your component in the current language.
Use it when you write a component with its own built-in texts.

Labels are looked up the same way as in Numior UI components. First comes the `translate`
function, then the `messages` dictionary from the settings, then the built-in Russian or English
text.

## Signature

<SignatureReference :names="['useMessages', 'plural']" />

## Plural forms

```ts
import { plural } from '@numior/vue';

const files = (count: number): string =>
  `${count} ${plural('en', count, { one: 'file', other: 'files' })}`;
```

`plural(language, count, forms)` picks the word form for a number through `Intl.PluralRules`.
When the needed form is missing, it takes `other`. `language` is the language the forms are
written in, not the app locale.

The label lookup order and new languages are described in [Localization](/en/guide/localization).
