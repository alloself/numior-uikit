# Configuration

One plugin, `createNuiConfig`, sets everything the components take from the environment. That
is the locale, the writing direction, the text dictionary, the icons, the colour scheme and
the toast options. `provideNuiConfig` in the `setup` of an own component gives the same options
to a subtree; nested calls layer.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import App from './App.vue';

createApp(App)
  .use(
    createNuiConfig({
      locale: 'en-US',
      dir: 'ltr',
      colorScheme: { storageKey: 'theme' },
      toasts: { duration: 6000, limit: 3 },
    }),
  )
  .mount('#app');
```

## Options

| Option        | Type                                   | What it does                                                                          |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `locale`      | `string`, ref or getter                | Number, date and time formats and the language of built-in texts; `en-US` without it. |
| `dir`         | `'ltr' \\                              | 'rtl'`, ref or getter                                                                 | Writing direction; without it the nearest `dir` attribute is read. |
| `messages`    | `NuiLocaleMessages`, ref or getter     | Dictionary overrides and new languages, see [Localization](/en/guide/localization).   |
| `translate`   | `(key, params, locale) => string?`     | Texts from the app's i18n library, asked before the dictionary.                       |
| `icons`       | `Record<string, Component>`            | Icon registry by alias, see [Icon](/en/components/icon).                              |
| `colorScheme` | `{ storageKey?, initial?, scope? }`    | Shared colour scheme for `useColorScheme`, see [Theming](/en/guide/theming).          |
| `toasts`      | `{ duration?, exitDuration?, limit? }` | Lifetime and number of simultaneous toasts, see [Toast](/en/components/toast).        |

## Signature

<SignatureReference :names="['createNuiConfig', 'provideNuiConfig']" />

## Subtree

`provideNuiConfig` is called in the `setup` of a component and applies to its descendants.
This is how one area of a page gets another locale, its own icon set or writing direction;
the kit ships no React-style provider components.

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/vue';

const { locale } = defineProps<{ locale: string }>();

provideNuiConfig({ locale: () => locale });
</script>
```

`locale`, `dir` and `messages` take a value, a ref or a getter: a change re-renders the texts
and formats at once. A component prop always beats the configuration: `locale` on a calendar,
`dir` on an element, `closeLabel` on a dialog.

## What is read without configuration

The components work without the plugin. They use English texts, the `en-US` locale, the
direction from the document's `dir` attribute, the default icon set and the scheme from the
`data-nui-theme` attribute. The kit does not read `navigator.language`, so the server and
client markup match.
