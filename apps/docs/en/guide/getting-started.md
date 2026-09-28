# Getting started

Numior UI is a component set for Vue 3.5+ with explicit styles, shared tokens and SSR support.
The packages are private for now and available inside the workspace.

## Installation

```sh
pnpm add @numior/vue @numior/tokens
```

`@numior/tokens` provides the themes and tokens, `@numior/vue` the components. Forms live in
`@numior/forms`, the Tailwind preset in `@numior/tailwind`.

## Styles

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
```

`base.css` resets the `body` margin and sets the page background, text colour and font from the tokens.
`styles.css` loads the styles of every component; a component page shows its own file
`@numior/vue/styles/<component>.css`. CSS is never imported from JavaScript on its own.

## First component

<Example name="guide/First" />

Components are styled along two axes: `variant` sets the shape, `tone` the role, `size` a step
inside the density. Native attributes, events and classes reach the root element. Form controls draw
`label`, `description` and `error` themselves; `NuiField` serves slots and several controls in one field.

## Application setup

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ locale: 'en-US', colorScheme: { storageKey: 'theme' } }))
  .mount('#app');
```

The plugin sets the language of built-in texts, the shared colour scheme, icons and the writing
direction. Without it components run on English texts and the system scheme.

## Themes and density

```html
<html data-nui-theme="dark" data-nui-density="compact"></html>
```

`data-nui-theme` accepts `light`, `dark` and `system`, `data-nui-density` accepts `comfortable`
and `compact`. Both attributes work on any element, not only the root.

## Next

- [Button](/en/components/button) — the first component with a configurator and the API.
- [Theming](/en/guide/theming) — tokens, accents and custom themes.
- [Localization](/en/guide/localization) — dictionaries and translations of built-in texts.
