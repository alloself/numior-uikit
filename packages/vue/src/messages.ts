import type { NuiAlertMessages } from './alert/alert.messages';
import type { NuiAvatarMessages } from './avatar/avatar.messages';
import type { NuiBreadcrumbsMessages } from './breadcrumbs/breadcrumbs.messages';
import type { NuiCalendarMessages } from './calendar/calendar.messages';
import type { NuiChipMessages } from './chip/chip.messages';
import type { NuiComboboxMessages } from './combobox/combobox.messages';
import type { NuiDatePickerMessages } from './date-picker/date-picker.messages';
import type { NuiDialogMessages } from './dialog/dialog.messages';
import type { NuiListMessages } from './list/list.messages';
import type { NuiNumberFieldMessages } from './number-field/number-field.messages';
import type { NuiPaginationMessages } from './pagination/pagination.messages';
import type { NuiSelectMessages } from './select/select.messages';
import type { NuiSidebarMessages } from './sidebar/sidebar.messages';
import type { NuiTableMessages } from './table/table.messages';
import type { NuiTimeFieldMessages } from './time-field/time-field.messages';
import type { NuiToastMessages } from './toast/toast.messages';

export interface NuiVueMessages {
  readonly alert: NuiAlertMessages;
  readonly avatar: NuiAvatarMessages;
  readonly breadcrumbs: NuiBreadcrumbsMessages;
  readonly calendar: NuiCalendarMessages;
  readonly chip: NuiChipMessages;
  readonly combobox: NuiComboboxMessages;
  readonly datePicker: NuiDatePickerMessages;
  readonly dialog: NuiDialogMessages;
  readonly list: NuiListMessages;
  readonly numberField: NuiNumberFieldMessages;
  readonly pagination: NuiPaginationMessages;
  readonly select: NuiSelectMessages;
  readonly sidebar: NuiSidebarMessages;
  readonly table: NuiTableMessages;
  readonly timeField: NuiTimeFieldMessages;
  readonly toast: NuiToastMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiVueMessages {}
}
