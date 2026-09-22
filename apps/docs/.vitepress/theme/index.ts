import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { NuiButton, NuiConfigProvider, NuiIcon } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
import '@numior/utilities/utilities.css';
import './demo.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('NuiButton', NuiButton);
    app.component('NuiIcon', NuiIcon);
    app.component('NuiConfigProvider', NuiConfigProvider);
  },
} satisfies Theme;
