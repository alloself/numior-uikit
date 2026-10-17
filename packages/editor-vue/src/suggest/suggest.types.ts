import type { NuiListEntry } from '@numior/vue';

export interface NuiEditorSuggestMenuProps {
  id: string;
  entries: readonly NuiListEntry[];
  active: number;
  anchor: HTMLElement | null;
  open: boolean;
  label: string;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  emptyLabel?: string | undefined;
}
