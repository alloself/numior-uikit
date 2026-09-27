# useMessages

`useMessages(catalog, locale)` returns the catalog texts in the current language with the
configuration layers applied. The layers are the `translate` hook, the `messages` overrides
and the built-in Russian or English. Every kit component gets its labels this way; `plural` picks a word form
by count.

## Signature

<SignatureReference :names="['useMessages', 'plural']" />

## Plural forms

```ts
import { plural } from '@numior/vue';

const files = (count: number): string =>
  `${count} ${plural('en', count, { one: 'file', other: 'files' })}`;
```

`plural(language, count, forms)` uses `Intl.PluralRules` and falls back to `other`. The
language is the one the forms are written in, not the app locale. The text resolution order
and own languages are described in [Localization](/en/guide/localization).
