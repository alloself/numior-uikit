export interface NuiEditorLinkPanelProps {
  anchor: HTMLElement | null;
  href: string;
  removable: boolean;
  valid: (href: string) => boolean;
}
