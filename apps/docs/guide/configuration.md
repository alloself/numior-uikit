# Конфигурация

Один плагин `createNuiConfig` задаёт всё, что компоненты берут из окружения: локаль,
направление письма, словарь текстов, иконки, цветовую схему и параметры уведомлений. Для
поддерева те же опции даёт `provideNuiConfig` в `setup` собственного компонента; вложенные
вызовы наслаиваются.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
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

## Опции

| Опция         | Тип                                    | Что делает                                                                     |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `locale`      | `string`, ref или геттер               | Формат чисел, дат и времени и язык встроенных текстов; без неё `en-US`.        |
| `dir`         | `'ltr' \\                              | 'rtl'`, ref или геттер                                                         | Направление письма; без него читается ближайший атрибут `dir`. |
| `messages`    | `NuiLocaleMessages`, ref или геттер    | Переопределения словаря и новые языки, см. [Локализация](/guide/localization). |
| `translate`   | `(key, params, locale) => string?`     | Тексты из i18n-библиотеки приложения, спрашивается раньше словаря.             |
| `icons`       | `Record<string, Component>`            | Реестр иконок по алиасам, см. [Icon](/components/icon).                        |
| `colorScheme` | `{ storageKey?, initial?, scope? }`    | Общая цветовая схема для `useColorScheme`, см. [Темизация](/guide/theming).    |
| `toasts`      | `{ duration?, exitDuration?, limit? }` | Время жизни и число одновременных уведомлений, см. [Toast](/components/toast). |

## Сигнатура

<SignatureReference :names="['createNuiConfig', 'provideNuiConfig']" />

## Поддерево

`provideNuiConfig` вызывается в `setup` компонента и действует на его потомков. Так одна
область страницы получает другую локаль, свой набор иконок или направление письма, а
компонентов-провайдеров в духе React кит не поставляет.

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/vue';

const { locale } = defineProps<{ locale: string }>();

provideNuiConfig({ locale: () => locale });
</script>
```

Значение, ref или геттер принимают `locale`, `dir` и `messages`: смена значения сразу
перерисовывает тексты и форматы. Проп компонента всегда сильнее конфигурации: `locale` на
календаре, `dir` на элементе, `closeLabel` на диалоге.

## Что читается без конфигурации

Без плагина компоненты работают: тексты английские, локаль `en-US`, направление из атрибута
`dir` документа, иконки из набора по умолчанию, схема из атрибута `data-nui-theme`.
`navigator.language` кит не читает, чтобы серверная и клиентская разметка совпадали.
