import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import {
  createNuiConfig,
  NuiAlert,
  NuiBreadcrumbs,
  NuiButton,
  NuiCheckbox,
  NuiChip,
  NuiCombobox,
  NuiConfigProvider,
  NuiDialog,
  NuiDrawer,
  NuiField,
  NuiFieldDescription,
  NuiFieldError,
  NuiFieldLabel,
  NuiIcon,
  NuiInput,
  NuiLink,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  NuiPagination,
  NuiPopover,
  NuiProgress,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
  NuiSkeleton,
  NuiSwitch,
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
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
    app.component('NuiLink', NuiLink);
    app.component('NuiMenu', NuiMenu);
    app.component('NuiMenuItem', NuiMenuItem);
    app.component('NuiMenuCheckboxItem', NuiMenuCheckboxItem);
    app.component('NuiMenuRadioGroup', NuiMenuRadioGroup);
    app.component('NuiMenuRadioItem', NuiMenuRadioItem);
    app.component('NuiMenuSeparator', NuiMenuSeparator);
    app.component('NuiMenuLabel', NuiMenuLabel);
    app.component('NuiMenuSub', NuiMenuSub);
    app.component('NuiTabs', NuiTabs);
    app.component('NuiTabList', NuiTabList);
    app.component('NuiTab', NuiTab);
    app.component('NuiTabPanel', NuiTabPanel);
    app.component('NuiBreadcrumbs', NuiBreadcrumbs);
    app.component('NuiSelect', NuiSelect);
    app.component('NuiCombobox', NuiCombobox);
    app.component('NuiChip', NuiChip);
    app.component('NuiPagination', NuiPagination);
  },
} satisfies Theme;
