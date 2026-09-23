import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import {
  createNuiConfig,
  NuiAlert,
  NuiButton,
  NuiCheckbox,
  NuiConfigProvider,
  NuiDialog,
  NuiDrawer,
  NuiField,
  NuiFieldDescription,
  NuiFieldError,
  NuiFieldLabel,
  NuiIcon,
  NuiInput,
  NuiPopover,
  NuiProgress,
  NuiRadio,
  NuiRadioGroup,
  NuiSkeleton,
  NuiSwitch,
  NuiTextarea,
  NuiToast,
  NuiToaster,
  NuiTooltip,
} from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
import '@numior/utilities/utilities.css';
import './demo.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(createNuiConfig({}));
    app.component('NuiButton', NuiButton);
    app.component('NuiIcon', NuiIcon);
    app.component('NuiConfigProvider', NuiConfigProvider);
    app.component('NuiField', NuiField);
    app.component('NuiFieldLabel', NuiFieldLabel);
    app.component('NuiFieldDescription', NuiFieldDescription);
    app.component('NuiFieldError', NuiFieldError);
    app.component('NuiInput', NuiInput);
    app.component('NuiTextarea', NuiTextarea);
    app.component('NuiCheckbox', NuiCheckbox);
    app.component('NuiRadioGroup', NuiRadioGroup);
    app.component('NuiRadio', NuiRadio);
    app.component('NuiSwitch', NuiSwitch);
    app.component('NuiDialog', NuiDialog);
    app.component('NuiDrawer', NuiDrawer);
    app.component('NuiPopover', NuiPopover);
    app.component('NuiTooltip', NuiTooltip);
    app.component('NuiToaster', NuiToaster);
    app.component('NuiToast', NuiToast);
    app.component('NuiAlert', NuiAlert);
    app.component('NuiProgress', NuiProgress);
    app.component('NuiSkeleton', NuiSkeleton);
  },
} satisfies Theme;
