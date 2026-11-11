# Getting started

Install and configure Numior UI in a Vue 3.5+ project.

## Installation

Install the components and themes:

::: code-group

```sh [pnpm]
pnpm add @numior/vue @numior/tokens
```

```sh [npm]
npm install @numior/vue @numior/tokens
```

```sh [yarn]
yarn add @numior/vue @numior/tokens
```

```sh [bun]
bun add @numior/vue @numior/tokens
```

:::

Forms and the Tailwind preset are installed separately: they are the `@numior/forms` and
`@numior/tailwind` packages.

## Styles

Load the styles in the entry point of your app:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
```

If your app builds its styles from a CSS file, load them there:

```css
@import '@numior/tokens/theme.css';
@import '@numior/tokens/base.css';
@import '@numior/vue/styles.css';
```

`theme.css` holds the colors, spacing and radii of the light and dark themes. `base.css` sets the
page background, font and text color. `styles.css` contains the styles of every component.

To load less, use the files of the components you need instead of `styles.css`, for example
`@numior/vue/styles/button.css`. Each component page shows the path to its file. Composite
components also need the files of their parts: `NuiSelect` uses `NuiButton` and `NuiList`.

## First component

Import components from `@numior/vue` and use them in a template:

<Example name="guide/First" />

The `variant` prop changes the style of a component, `tone` its color and `size` its size.
Attributes and event listeners you pass to a component land on its root element.

Inputs render the label, hint and error text from the `label`, `description` and `error` props.
You need the `NuiField` wrapper only when the label is your own markup or a field holds several
controls.

## Plugin

Install the `createNuiConfig` plugin to set the language of built-in labels such as "Close" and
"No options", the theme, icons and the writing direction:

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ locale: 'en-US', colorScheme: { storageKey: 'theme' } }))
  .mount('#app');
```

With this setup the labels are in English and the theme the user picks is kept in `localStorage`
under the `theme` key. Components work without the plugin too: labels are in English and the
theme follows the system.

## Theme and density

Attributes on `<html>` set the theme and density:

```html
<html data-nui-theme="dark" data-nui-density="compact"></html>
```

`data-nui-theme` takes `light`, `dark` or `system`, where `system` follows the system setting.
`data-nui-density="compact"` makes controls shorter and spacing tighter; the default is
`comfortable`. The attributes work on any element, and then the theme or density changes only
inside it.

## Next

- [Button](/en/components/button) — the button with a live configurator and the full API.
- [Theming](/en/guide/theming) — tokens, accents and custom themes.
- [Localization](/en/guide/localization) — dictionaries and translations of built-in labels.
