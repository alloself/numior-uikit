import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import {
  createNuiConfig,
  NuiAlert,
  NuiAppBar,
  NuiAvatar,
  NuiAvatarGroup,
  NuiBadge,
  NuiBreadcrumbs,
  NuiButton,
  NuiCalendar,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  NuiCheckbox,
  NuiChip,
  NuiCombobox,
  NuiDatePicker,
  NuiDateRangePicker,
  NuiDialog,
  NuiDrawer,
  NuiEmpty,
  NuiField,
  NuiFieldDescription,
  NuiFieldError,
  NuiFieldLabel,
  NuiIcon,
  NuiInput,
  NuiLayout,
  NuiLink,
  NuiList,
  NuiListItem,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  NuiNumberField,
  NuiPagination,
  NuiPopover,
  NuiProgress,
  NuiRadio,
  NuiRadioGroup,
  NuiSelect,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarHeader,
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
  NuiSkeleton,
  NuiStepper,
  NuiSwitch,
  NuiTab,
  NuiTable,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  NuiTextarea,
  NuiTimeField,
  NuiToast,
  NuiToaster,
  NuiTooltip,
  NuiTree,
  NuiUpload,
} from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
import '@numior/utilities/utilities.css';
import './demo.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.use(
      createNuiConfig({
        locale: () => (router.route.path.startsWith('/en/') ? 'en-US' : 'ru-RU'),
      }),
    );

    app.component('NuiButton', NuiButton);
    app.component('NuiIcon', NuiIcon);
    app.component('NuiField', NuiField);
    app.component('NuiFieldLabel', NuiFieldLabel);
    app.component('NuiFieldDescription', NuiFieldDescription);
    app.component('NuiFieldError', NuiFieldError);
    app.component('NuiInput', NuiInput);
    app.component('NuiTextarea', NuiTextarea);
    app.component('NuiNumberField', NuiNumberField);
    app.component('NuiTimeField', NuiTimeField);
    app.component('NuiCalendar', NuiCalendar);
    app.component('NuiDatePicker', NuiDatePicker);
    app.component('NuiDateRangePicker', NuiDateRangePicker);
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
    app.component('NuiStepper', NuiStepper);
    app.component('NuiSelect', NuiSelect);
    app.component('NuiCombobox', NuiCombobox);
    app.component('NuiChip', NuiChip);
    app.component('NuiPagination', NuiPagination);
    app.component('NuiBadge', NuiBadge);
    app.component('NuiAvatar', NuiAvatar);
    app.component('NuiAvatarGroup', NuiAvatarGroup);
    app.component('NuiCard', NuiCard);
    app.component('NuiCardHeader', NuiCardHeader);
    app.component('NuiCardTitle', NuiCardTitle);
    app.component('NuiCardDescription', NuiCardDescription);
    app.component('NuiCardContent', NuiCardContent);
    app.component('NuiCardFooter', NuiCardFooter);
    app.component('NuiCardMedia', NuiCardMedia);
    app.component('NuiList', NuiList);
    app.component('NuiListItem', NuiListItem);
    app.component('NuiEmpty', NuiEmpty);
    app.component('NuiTree', NuiTree);
    app.component('NuiTable', NuiTable);
    app.component('NuiUpload', NuiUpload);
    app.component('NuiLayout', NuiLayout);
    app.component('NuiAppBar', NuiAppBar);
    app.component('NuiSidebar', NuiSidebar);
    app.component('NuiSidebarHeader', NuiSidebarHeader);
    app.component('NuiSidebarContent', NuiSidebarContent);
    app.component('NuiSidebarFooter', NuiSidebarFooter);
    app.component('NuiSidebarGroup', NuiSidebarGroup);
    app.component('NuiSidebarItem', NuiSidebarItem);
    app.component('NuiSidebarSub', NuiSidebarSub);
    app.component('NuiSidebarTrigger', NuiSidebarTrigger);
  },
} satisfies Theme;
