# @numior/kit

Numior UI in one package: Vue 3 components, forms, table, spreadsheet, editor and charts, with a Vite plugin and a Nuxt module.

[Numior UI](https://ui.numior.ru/en/) is a UI kit for Vue 3.5+ and Tailwind CSS 4. This package brings all of its modules under one version.

Until 1.0 the packages ship as `1.0.0-alpha.N`, and the API still changes between them.

## Quick start

```sh
pnpm add @numior/kit
```

Add the Vite plugin. It brings in Tailwind 4 and keeps in the CSS only the styles of the components your code uses:

```ts
import vue from '@vitejs/plugin-vue';
import { numior } from '@numior/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), numior()],
});
```

Import Tailwind and the kit styles in the CSS file of the app:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';
```

Install the Vue plugin, which sets the language of built-in labels:

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';
import './style.css';

createApp(App)
  .use(createNuiConfig({ locale: 'en-US' }))
  .mount('#app');
```

Nuxt 4 takes the module `@numior/kit/nuxt`, covered in [SSR and Nuxt](https://ui.numior.ru/en/guide/ssr#nuxt).

## Docs

[English](https://ui.numior.ru/en/guide/getting-started) · [Русский](https://ui.numior.ru/guide/getting-started)

## License

MIT
