import type { NuiAlertMessages } from './alert/alert.messages';
import type { NuiChipMessages } from './chip/chip.messages';
import type { NuiDialogMessages } from './dialog/dialog.messages';
import type { NuiSidebarMessages } from './sidebar/sidebar.messages';
import type { NuiToastMessages } from './toast/toast.messages';

export interface NuiVueMessages {
  readonly alert: NuiAlertMessages;
  readonly chip: NuiChipMessages;
  readonly dialog: NuiDialogMessages;
  readonly sidebar: NuiSidebarMessages;
  readonly toast: NuiToastMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiVueMessages {}
}
