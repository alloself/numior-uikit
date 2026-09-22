import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import {
  NuiButton,
  NuiConfigProvider,
  NuiField,
  NuiFieldDescription,
  NuiFieldError,
  NuiFieldLabel,
  NuiIcon,
  NuiInput,
  NuiTextarea,
} from '@numior/vue';
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
    app.component('NuiField', NuiField);
    app.component('NuiFieldLabel', NuiFieldLabel);
    app.component('NuiFieldDescription', NuiFieldDescription);
    app.component('NuiFieldError', NuiFieldError);
    app.component('NuiInput', NuiInput);
    app.component('NuiTextarea', NuiTextarea);
  },
} satisfies Theme;
