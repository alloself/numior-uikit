# Getting started

Install and configure Numior UI in a Vue 3.5+ project.

## Installation

Install Numior UI:

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

The modules are in the same package, each under its own subpath, such as `@numior/kit/table` or
`@numior/kit/editor`. Modules your app does not import stay out of the bundle.

## Styles

Load the styles in the entry point of your app:

```ts
import '@numior/kit/theme.css';
import '@numior/kit/base.css';
import '@numior/kit/styles.css';
```

If your app builds its styles from a CSS file, load them there:

```css
@import '@numior/kit/theme.css';
@import '@numior/kit/base.css';
@import '@numior/kit/styles.css';
```

`theme.css` holds the colors, spacing and radii of the light and dark themes. `base.css` sets the
page background, font and text color. `styles.css` contains the styles of every component.

To load less, use the files of the components you need instead of `styles.css`, for example
`@numior/kit/styles/button.css`. Composite components also need the files of their parts, so the
Installation section of each component page lists all of them.

## First component

Import components from `@numior/kit` and use them in a template:

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
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ locale: 'en-US', colorScheme: { storageKey: 'theme' } }))
  .mount('#app');
```

With this setup the labels are in English and the theme the user picks is kept in `localStorage`
under the `theme` key. Components work without the plugin too: labels are in English and the
theme follows the system.

## Theme and density

Classes on `<html>` set the theme and density:

```html
<html class="nui-theme--dark nui-theme--density-compact"></html>
```

`nui-theme--light`, `nui-theme--dark` and `nui-theme--system` pick the theme, where `system`
follows the system setting, as does `<html>` without a class. `nui-theme--density-compact` makes
controls shorter and spacing tighter. The classes work on any element, and then the theme or
density changes only inside it.

## Next

- [Button](/en/components/button) — the button with a live configurator and the full API.
- [Theming](/en/guide/theming) — tokens, accents and custom themes.
- [Localization](/en/guide/localization) — dictionaries and translations of built-in labels.
