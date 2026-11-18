# Getting started

Add Numior UI to a Vue 3.5+ app built with Vite. Nuxt takes different steps, covered in
[SSR and Nuxt](/en/guide/ssr#nuxt).

## Installation

:::: steps

### Install the package

::: code-group

```sh [pnpm]
pnpm add @numior/kit
```

```sh [npm]
npm install @numior/kit
```

```sh [yarn]
yarn add @numior/kit
```

```sh [bun]
bun add @numior/kit
```

:::

The package holds every component and module, and a module such as `@numior/kit/table` reaches
the bundle only when the app imports it.

### Add the Vite plugin

The plugin brings in Tailwind 4 and keeps in the CSS only the styles of the components your code
uses:

```ts
import vue from '@vitejs/plugin-vue';
import { numior } from '@numior/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), numior()],
});
```

### Import the styles

Add Tailwind and Numior UI to the CSS file of the app, for example `src/style.css`:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';
```

### Import the CSS and the Vue plugin

The `createNuiConfig` plugin sets the language of built-in labels, and
[Configuration](/en/guide/configuration) covers the rest of its options:

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';
import './style.css';

createApp(App)
  .use(createNuiConfig({ locale: 'en-US' }))
  .mount('#app');
```

### Use the components

Import components from `@numior/kit` and use them in a template:

<Example name="guide/First" />

::::

## Next

- [Tailwind](/en/guide/tailwind) — how the styles are built and how to set up the theme.
- [Button](/en/components/button) — the button with a live configurator and the full API.
- [Theming](/en/guide/theming) — light and dark schemes, accents and density.
- [Localization](/en/guide/localization) — dictionaries and translations of built-in labels.
