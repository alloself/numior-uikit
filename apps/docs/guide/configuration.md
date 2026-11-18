# Конфигурация

Как задать язык, направление текста, тему, иконки и уведомления для всего приложения или для
части страницы.

## Плагин

Передайте настройки в плагин `createNuiConfig` при создании приложения:

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';

createApp(App)
  .use(
    createNuiConfig({
      locale: 'ru-RU',
      dir: 'ltr',
      colorScheme: { storageKey: 'theme' },
      toasts: { duration: 6000, limit: 3 },
    }),
  )
  .mount('#app');
```

Компоненты читают эти настройки сами, передавать их каждому компоненту не нужно. В примере
подписи будут на русском, выбранная тема сохранится в `localStorage`, а уведомления будут
держаться 6 секунд, не больше трёх сразу.

## Опции

| Опция         | Тип и назначение                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`      | `string`, ref или геттер. Язык встроенных подписей и формат чисел, дат и времени. По умолчанию `en-US`.                                                  |
| `dir`         | `'ltr'` или `'rtl'`, ref или геттер. Направление текста. Если не задано, берётся из ближайшего атрибута `dir`.                                           |
| `messages`    | `NuiLocaleMessages`, ref или геттер. Свои тексты вместо встроенных и новые языки, см. [Локализация](/guide/localization).                                |
| `translate`   | `(key, params, locale) => string?`. Берёт тексты из i18n-библиотеки приложения. Вызывается раньше, чем словарь `messages`.                               |
| `icons`       | `Record<string, Component>`. Свои иконки вместо встроенных, по имени иконки, см. [Icon](/components/icon).                                               |
| `colorScheme` | `{ storageKey?, initial?, scope? }`. Тема для `useColorScheme`: ключ в `localStorage`, тема по умолчанию, см. [Темы оформления](/guide/theming).         |
| `toasts`      | `{ duration?, exitDuration?, limit? }`. Сколько показывать уведомление и сколько уведомлений видно сразу, см. [Toast](/components/toast).                |
| `link`        | `Component` или имя компонента. Компонент ссылки для свойства `to`. По умолчанию `NuxtLink` или `RouterLink` приложения.                                 |
| `controls`    | `NuiControlRegistry`. Контролы для форм из JSON и редакторов, например `kitControls`, см. [useControls](/composables/controls).                          |
| `highlighter` | `NuiHighlighter` или `false`. Подсветка кода в `NuiCode`, редакторе и опубликованном тексте, по умолчанию Shiki, см. [Code](/components/code#подсветка). |

Чтобы ваш компонент выводил ту же ссылку, что и компоненты Numior UI, получите её через
`useConfiguredLink()`. Если опция `link` не задана, функция вернёт `null`.

## Сигнатура

<SignatureReference :names="['createNuiConfig', 'provideNuiConfig', 'useConfiguredLink']" />

## Настройки для части страницы

Вызовите `provideNuiConfig` в `setup` компонента, чтобы задать другие настройки для всего, что
внутри него. Так одна часть страницы получает свой язык, свои иконки или направление текста:

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/kit';

const { locale } = defineProps<{ locale: string }>();

provideNuiConfig({ locale: () => locale });
</script>
```

`locale`, `dir` и `messages` принимают значение, ref или геттер. Когда значение меняется,
подписи и форматы обновляются сразу.

Свойство компонента важнее настроек: `locale` у календаря, `closeLabel` у диалога и атрибут
`dir` на элементе перекрывают то, что задано в плагине.

## Без плагина

Компоненты работают и без плагина. Подписи тогда на английском, числа и даты в формате `en-US`,
а направление текста берётся из атрибута `dir` документа. Тему выбирает класс `nui-theme--*` на
`<html>`, а без класса она следует за системой.

Язык браузера из `navigator.language` не учитывается, чтобы разметка с сервера совпала с
разметкой в браузере.
