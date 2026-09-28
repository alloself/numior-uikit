# SSR and Nuxt

The components render on the server without a DOM and hydrate without mismatches. Ids come
from `useId` and media queries answer `false` until mounting. The calendar's today arrives as
a prop, texts and formats come from the request configuration.

## Rules

- Pass the locale and the direction to `createNuiConfig` explicitly per request; the kit reads
  neither `navigator.language` nor `Accept-Language`.
- Colour scheme: the `data-nui-theme` attribute on `<html>` from a cookie or the value
  `system`. The `colorSchemeScript(storageKey)` script in `<head>` applies the saved scheme
  before paint.
- The calendar, the date pickers and Time field take `today`. Without it today comes from the
  clock only after mounting, so the server markup ignores the server time zone.
- `useMediaQuery` returns `false` until mounting: `NuiLayout` treats the screen as wide on the
  server and in the first frame, and the sidebar does not flash.
- Layers (`NuiDialog`, `NuiDrawer`, `NuiPopover`) render their content closed; opening happens
  on the client.

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

The client calls `createSSRApp` with the same `createNuiConfig` and mounts the app over the
server markup.

## Nuxt

The `@numior/nuxt` module wires the kit in one line. It registers the plugin with
`createNuiConfig`, auto-imports the `Nui*` components and `use*` composables and adds the token
and component CSS. The scheme script lands in `<head>`, and `to` renders `NuxtLink`.

```ts
export default defineNuxtConfig({
  modules: ['@numior/nuxt'],
  numior: {
    locale: 'en-US',
    colorScheme: { storageKey: 'theme', initial: 'system' },
  },
});
```

The `numior` options are serialisable: `locale`, `dir`, `colorScheme` (`storageKey`, `initial`
or `false`), `toasts`, plus the `css`, `components` and `composables` flags (`true` by
default). The dictionary, `translate`, the icon registry and an own link component live in
`app.config.ts`, because they are code rather than JSON:

```ts
export default defineAppConfig({
  numior: {
    messages: { en: { code: { copy: 'Copy the command' } } },
    icons: { check: MyCheck },
  },
});
```

`locale` and `dir` from `app.config` are read reactively and win over `nuxt.config`. When
`@numior/forms` is installed, its components, composables and CSS are registered the same way.

An auto-import name may collide, such as Nuxt's own `useLayout` or `useMediaQuery` from
`@vueuse/nuxt`. The other composable then wins, and the kit one is imported explicitly from
`@numior/vue`. Without the module the plugin goes through `defineNuxtPlugin` with
`createNuiConfig` and the scheme script through `useHead`.
