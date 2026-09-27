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

There is no dedicated module yet; the plugin is registered through `defineNuxtPlugin`, the
scheme script through `useHead`.

```ts
import { colorSchemeScript, createNuiConfig } from '@numior/vue';

export default defineNuxtPlugin((nuxtApp) => {
  const locale = useRequestHeader('accept-language')?.split(',')[0] ?? 'en-US';

  nuxtApp.vueApp.use(createNuiConfig({ locale, colorScheme: { storageKey: 'theme' } }));
  useHead({ script: [{ innerHTML: colorSchemeScript('theme') }] });
});
```

The token and component CSS goes into `nuxt.config.ts` through `css`:
`@numior/tokens/theme.css`, `@numior/tokens/base.css`, `@numior/vue/styles.css`.
