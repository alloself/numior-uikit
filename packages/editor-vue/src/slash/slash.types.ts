import type { SlashItem } from './slash-items';

export interface NuiEditorSlashMenuProps {
  id: string;
  items: readonly SlashItem[];
  active: number;
  anchor: HTMLElement | null;
  open: boolean;
}
