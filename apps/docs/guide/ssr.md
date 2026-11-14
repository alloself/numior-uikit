# SSR и Nuxt

Как рендерить компоненты на сервере в Vite SSR и подключить Numior UI к Nuxt.

## Что передать с сервера

Компоненты рендерятся на сервере без DOM, а в браузере гидрируются без расхождений в разметке.
Для этого передайте с сервера то, что компонент не может узнать сам:

- Язык и направление текста. Передайте `locale` и `dir` в `createNuiConfig` на каждый запрос:
  `navigator.language` и `Accept-Language` компоненты не читают.
- Тему. Поставьте на `<html>` класс `nui-theme--light` или `nui-theme--dark` из cookie, без
  класса страница следует за системой. Добавьте в `<head>` скрипт `colorSchemeScript(storageKey)`,
  чтобы сохранённая тема применилась до отрисовки страницы.
- Сегодняшнюю дату. Передайте `today` календарю, выбору даты и полю времени. Без `today` дата
  берётся из часов браузера уже после монтирования, поэтому часовой пояс сервера на разметку не
  влияет.

Остальное компоненты делают сами. `useMediaQuery` до монтирования возвращает `false`, поэтому
`NuiLayout` на сервере считает экран широким и боковая панель не мигает. `NuiDialog`,
`NuiDrawer` и `NuiPopover` рендерятся закрытыми и открываются уже в браузере.

## Vite SSR

Создайте приложение с плагином `createNuiConfig` и добавьте скрипт темы в `<head>`:

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

В браузере вызовите `createSSRApp` с теми же настройками `createNuiConfig` и смонтируйте
приложение поверх разметки с сервера.

## Nuxt

Добавьте модуль `@numior/nuxt` в `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@numior/nuxt'],
  numior: {
    locale: 'ru-RU',
    colorScheme: { storageKey: 'theme', initial: 'system' },
  },
});
```

Модуль подключает плагин `createNuiConfig`, стили и автоимпорт компонентов `Nui*` и композаблов
`use*`. Скрипт темы он добавляет в `<head>`, а ссылки со свойством `to` выводит через `NuxtLink`.
Если установлены `@numior/forms` или `@numior/table`, их компоненты и стили подключаются так же.

Модуль собирает CSS кита в своём входе Tailwind. Тему приложения задайте базовыми ключами в
`@theme static`, производные ключи следуют за ними:

```css
@import 'tailwindcss';
@import '@numior/tailwind';

@theme static {
  --radius-base: 1rem;
}
```

В `nuxt.config.ts` можно задать `locale`, `dir`, `colorScheme` (`storageKey`, `initial` или
`false`) и `toasts`. Флаги `css`, `components` и `composables` выключают стили и автоимпорт, по
умолчанию они включены.

Словарь, `translate`, свои иконки и компонент ссылки задайте в `app.config.ts`: это код, а
`nuxt.config.ts` принимает только JSON.

```ts
export default defineAppConfig({
  numior: {
    messages: { ru: { code: { copy: 'Скопировать команду' } } },
    icons: { check: MyCheck },
  },
});
```

`locale` и `dir` из `app.config.ts` важнее, чем из `nuxt.config.ts`, и при изменении сразу
применяются.

Если имя композабла совпадает с чужим, например `useLayout` у Nuxt или `useMediaQuery` у
`@vueuse/nuxt`, автоимпорт подставит чужой. Композабл Numior UI тогда импортируйте из
`@numior/vue` вручную.

Без модуля подключите `createNuiConfig` в плагине через `defineNuxtPlugin`, а скрипт темы
добавьте через `useHead`.
