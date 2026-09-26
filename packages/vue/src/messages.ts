import type { NuiAlertMessages } from './alert/alert.messages';
import type { NuiBreadcrumbsMessages } from './breadcrumbs/breadcrumbs.messages';
import type { NuiChipMessages } from './chip/chip.messages';
import type { NuiComboboxMessages } from './combobox/combobox.messages';
import type { NuiDialogMessages } from './dialog/dialog.messages';
import type { NuiListMessages } from './list/list.messages';
import type { NuiPaginationMessages } from './pagination/pagination.messages';
import type { NuiSelectMessages } from './select/select.messages';
import type { NuiSidebarMessages } from './sidebar/sidebar.messages';
import type { NuiToastMessages } from './toast/toast.messages';

export interface NuiVueMessages {
  readonly alert: NuiAlertMessages;
  readonly breadcrumbs: NuiBreadcrumbsMessages;
  readonly chip: NuiChipMessages;
  readonly combobox: NuiComboboxMessages;
  readonly dialog: NuiDialogMessages;
  readonly list: NuiListMessages;
  readonly pagination: NuiPaginationMessages;
  readonly select: NuiSelectMessages;
  readonly sidebar: NuiSidebarMessages;
  readonly toast: NuiToastMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiVueMessages {}
}
