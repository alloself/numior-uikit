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

Отдельного модуля пока нет; плагин подключается через `defineNuxtPlugin`, а скрипт схемы —
через `useHead`.

```ts
import { colorSchemeScript, createNuiConfig } from '@numior/vue';

export default defineNuxtPlugin((nuxtApp) => {
  const locale = useRequestHeader('accept-language')?.split(',')[0] ?? 'ru-RU';

  nuxtApp.vueApp.use(createNuiConfig({ locale, colorScheme: { storageKey: 'theme' } }));
  useHead({ script: [{ innerHTML: colorSchemeScript('theme') }] });
});
```

CSS токенов и компонентов подключается в `nuxt.config.ts` через `css`:
`@numior/tokens/theme.css`, `@numior/tokens/base.css`, `@numior/vue/styles.css`.
