# SSR и Nuxt

Компоненты рендерятся на сервере без DOM и гидрируются без расхождений. Идентификаторы
берутся из `useId`, медиазапросы отвечают `false` до монтирования, сегодняшняя дата
календаря приходит пропом, а тексты и форматы — из конфигурации запроса.

## Правила

- Локаль и направление передавайте в `createNuiConfig` явно для каждого запроса; кит не читает
  `navigator.language` и `Accept-Language`.
- Цветовая схема: атрибут `data-nui-theme` на `<html>` из cookie или значение `system`, плюс
  скрипт `colorSchemeScript(storageKey)` в `<head>` — он ставит сохранённую схему до
  отрисовки.
- Календарь, выбор даты и Time field принимают `today`. Без него сегодняшняя дата берётся из
  часов только после монтирования, и серверная разметка не зависит от пояса сервера.
- `useMediaQuery` возвращает `false` до монтирования: `NuiLayout` считает экран широким на
  сервере и в первом кадре, а боковая панель не мигает.
- Слои (`NuiDialog`, `NuiDrawer`, `NuiPopover`) рендерят содержимое закрытым; открытие
  происходит на клиенте.

## Vite SSR

```ts
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { colorSchemeScript, createNuiConfig } from '@numior/vue';
import App from './App.vue';

export const render = async (locale: string, dir: 'ltr' | 'rtl') => {
  const app = createSSRApp(App).use(createNuiConfig({ locale, dir }));
  const html = await renderToString(app);
  const head = `<script>${colorSchemeScript('theme')}</script>`;

  return { html, head };
};
```

Клиент вызывает `createSSRApp` с тем же `createNuiConfig` и монтирует приложение поверх
серверной разметки.

## Nuxt

Модуль `@numior/nuxt` подключает кит одной строкой. Он регистрирует плагин с `createNuiConfig`,
автоимпорт компонентов `Nui*` и композаблов `use*`, CSS токенов и компонентов. Скрипт схемы
попадает в `<head>`, а `to` рендерит `NuxtLink`.

```ts
export default defineNuxtConfig({
  modules: ['@numior/nuxt'],
  numior: {
    locale: 'ru-RU',
    colorScheme: { storageKey: 'theme', initial: 'system' },
  },
});
```

Опции `numior` сериализуемые: `locale`, `dir`, `colorScheme` (`storageKey`, `initial` или
`false`), `toasts`, а также флаги `css`, `components` и `composables` (по умолчанию `true`).
Словарь, `translate`, реестр иконок и свой компонент ссылки живут в `app.config.ts`, потому что
это код, а не JSON:

```ts
export default defineAppConfig({
  numior: {
    messages: { ru: { code: { copy: 'Скопировать команду' } } },
    icons: { check: MyCheck },
  },
});
```

`locale` и `dir` из `app.config` читаются реактивно и побеждают `nuxt.config`. Если пакет
`@numior/forms` установлен, его компоненты, композаблы и CSS регистрируются так же.

При совпадении имён автоимпорта (`useLayout` самого Nuxt, `useMediaQuery` из `@vueuse/nuxt`)
побеждает чужой композабл, а композабл кита импортируется явно из `@numior/vue`. Без модуля
плагин подключается через `defineNuxtPlugin` с `createNuiConfig`, а скрипт схемы через
`useHead`.
