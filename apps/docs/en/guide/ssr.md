# SSR and Nuxt

How to render components on the server with Vite SSR and add Numior UI to Nuxt.

## What to pass from the server

Components render on the server without a DOM and hydrate in the browser without markup
mismatches. For that, pass from the server what a component cannot find out on its own:

- The language and writing direction. Pass `locale` and `dir` to `createNuiConfig` on every
  request: components read neither `navigator.language` nor `Accept-Language`.
- The theme. Put the `nui-theme--light` or `nui-theme--dark` class on `<html>` from a cookie;
  without a class the page follows the system. Add the `colorSchemeScript(storageKey)` script to
  `<head>` so the saved theme applies before the page paints.
- Today's date. Pass `today` to the calendar, date picker and time field. Without `today` the
  date comes from the browser clock after mounting, so the server time zone does not affect the
  markup.

Components handle the rest on their own. `useMediaQuery` returns `false` until mounting, so
`NuiLayout` treats the screen as wide on the server and the sidebar does not flash.
`NuiDialog`, `NuiDrawer` and `NuiPopover` render closed and open only in the browser.

## Vite SSR

Create the app with the `createNuiConfig` plugin and add the theme script to `<head>`:

```ts
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { colorSchemeScript, createNuiConfig } from '@numior/kit';
import App from './App.vue';

export const render = async (locale: string, dir: 'ltr' | 'rtl') => {
  const app = createSSRApp(App).use(createNuiConfig({ locale, dir }));
  const html = await renderToString(app);
  const head = `<script>${colorSchemeScript('theme')}</script>`;

  return { html, head };
};
```

In the browser, call `createSSRApp` with the same `createNuiConfig` settings and mount the app
over the server markup.

## Nuxt

Add the `@numior/kit/nuxt` module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@numior/kit/nuxt'],
  numior: {
    locale: 'en-US',
    colorScheme: { storageKey: 'theme', initial: 'system' },
  },
});
```

The module adds the `createNuiConfig` plugin, the styles and auto-imports of the `Nui*`
components and `use*` composables, forms and table included. It puts the theme script in
`<head>` and renders links with the `to` prop through `NuxtLink`.

The module builds the kit CSS in its own Tailwind entry. Set the theme of the app with base keys
in `@theme static`; the derived keys follow them:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';

@theme static {
  --radius-base: 1rem;
}
```

In `nuxt.config.ts` you can set `locale`, `dir`, `colorScheme` (`storageKey`, `initial` or
`false`) and `toasts`. The `css`, `components` and `composables` flags turn off the styles and
auto-imports; they are on by default.

Set the dictionary, `translate`, your own icons and the link component in `app.config.ts`: they
are code, and `nuxt.config.ts` takes only JSON.

```ts
export default defineAppConfig({
  numior: {
    messages: { en: { code: { copy: 'Copy the command' } } },
    icons: { check: MyCheck },
  },
});
```

`locale` and `dir` from `app.config.ts` win over `nuxt.config.ts` and apply as soon as they
change.

When a composable name clashes with another one, such as Nuxt's `useLayout` or `useMediaQuery`
from `@vueuse/nuxt`, auto-import picks the other one. Import the Numior UI composable from
`@numior/kit` by hand then.

Without the module, add `createNuiConfig` in a plugin with `defineNuxtPlugin` and the theme
script with `useHead`.
