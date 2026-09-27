import type { NuiAlertMessages } from './alert/alert.messages';
import type { NuiAvatarMessages } from './avatar/avatar.messages';
import type { NuiBreadcrumbsMessages } from './breadcrumbs/breadcrumbs.messages';
import type { NuiCalendarMessages } from './calendar/calendar.messages';
import type { NuiChipMessages } from './chip/chip.messages';
import type { NuiCodeMessages } from './code/code.messages';
import type { NuiComboboxMessages } from './combobox/combobox.messages';
import type { NuiDatePickerMessages } from './date-picker/date-picker.messages';
import type { NuiDialogMessages } from './dialog/dialog.messages';
import type { NuiListMessages } from './list/list.messages';
import type { NuiNumberFieldMessages } from './number-field/number-field.messages';
import type { NuiPaginationMessages } from './pagination/pagination.messages';
import type { NuiSelectMessages } from './select/select.messages';
import type { NuiSidebarMessages } from './sidebar/sidebar.messages';
import type { NuiStepperMessages } from './stepper/stepper.messages';
import type { NuiTableMessages } from './table/table.messages';
import type { NuiTimeFieldMessages } from './time-field/time-field.messages';
import type { NuiToastMessages } from './toast/toast.messages';
import type { NuiUploadMessages } from './upload/upload.messages';

export interface NuiVueMessages {
  readonly alert: NuiAlertMessages;
  readonly avatar: NuiAvatarMessages;
  readonly breadcrumbs: NuiBreadcrumbsMessages;
  readonly calendar: NuiCalendarMessages;
  readonly chip: NuiChipMessages;
  readonly code: NuiCodeMessages;
  readonly combobox: NuiComboboxMessages;
  readonly datePicker: NuiDatePickerMessages;
  readonly dialog: NuiDialogMessages;
  readonly list: NuiListMessages;
  readonly numberField: NuiNumberFieldMessages;
  readonly pagination: NuiPaginationMessages;
  readonly select: NuiSelectMessages;
  readonly sidebar: NuiSidebarMessages;
  readonly stepper: NuiStepperMessages;
  readonly table: NuiTableMessages;
  readonly timeField: NuiTimeFieldMessages;
  readonly toast: NuiToastMessages;
  readonly upload: NuiUploadMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiVueMessages {}
}
