import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { NuiButton } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('NuiButton', NuiButton);
  },
} satisfies Theme;
