# Configuration

How to set the language, writing direction, theme, icons and toasts for the whole app or for
part of a page.

## Plugin

Pass the settings to the `createNuiConfig` plugin when you create the app:

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

Components read these settings on their own, so you do not pass them to each component. In the
example the labels are in English and the chosen theme is saved in `localStorage`. Toasts stay
for 6 seconds, at most three at a time.

## Options

| Option        | Type                                   | What it does                                                                                                    |
| ------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `locale`      | `string`, ref or getter                | The language of built-in labels and the number, date and time format. `en-US` by default.                       |
| `dir`         | `'ltr'` or `'rtl'`, ref or getter      | The writing direction. When not set, it comes from the nearest `dir` attribute.                                 |
| `messages`    | `NuiLocaleMessages`, ref or getter     | Your own texts in place of the built-in ones and new languages, see [Localization](/en/guide/localization).     |
| `translate`   | `(key, params, locale) => string?`     | Takes texts from your app's i18n library. It is called before the `messages` dictionary.                        |
| `icons`       | `Record<string, Component>`            | Your own icons in place of the built-in ones, by icon name, see [Icon](/en/components/icon).                    |
| `colorScheme` | `{ storageKey?, initial?, scope? }`    | The theme for `useColorScheme`: the `localStorage` key and the default theme, see [Theming](/en/guide/theming). |
| `toasts`      | `{ duration?, exitDuration?, limit? }` | How long a toast stays and how many toasts are visible at once, see [Toast](/en/components/toast).              |
| `link`        | `Component` or a component name        | The link component for the `to` prop. Defaults to the app's `NuxtLink` or `RouterLink`.                         |
| `controls`    | `NuiControlRegistry`                   | Controls for JSON forms and editors, for example `kitControls`, see [useControls](/en/composables/controls).    |
| `highlighter` | `NuiHighlighter`                       | Code highlighting in `NuiCode`, the editor and published text, see [Code](/en/components/code#highlighter).     |

To make your own component render the same link as Numior UI components, get it through
`useConfiguredLink()`. When the `link` option is not set, the function returns `null`.

## Signature

<SignatureReference :names="['createNuiConfig', 'provideNuiConfig', 'useConfiguredLink']" />

## Settings for part of a page

Call `provideNuiConfig` in the `setup` of a component to set other settings for everything
inside it. This way one part of a page gets its own language, icons or writing direction:

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/vue';

const { locale } = defineProps<{ locale: string }>();

provideNuiConfig({ locale: () => locale });
</script>
```

`locale`, `dir` and `messages` take a value, a ref or a getter. When the value changes, labels
and formats update at once.

A component prop wins over the settings. For example, `locale` on a calendar, `closeLabel` on a
dialog and the `dir` attribute on an element override the plugin.

## Without the plugin

Components also work without the plugin. Labels are then in English, numbers and dates use the
`en-US` format, and the direction comes from the document's `dir` attribute. A `nui-theme--*`
class on `<html>` picks the theme, and without the class it follows the system.

The browser language from `navigator.language` is ignored, so the server markup matches the
markup in the browser.
