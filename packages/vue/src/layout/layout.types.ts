export type NuiLayoutHeader = 'inset' | 'full';

export interface NuiLayoutProps {
  id?: string | undefined;
  header?: NuiLayoutHeader | undefined;
  sidebarWidth?: string | undefined;
  railWidth?: string | undefined;
  endWidth?: string | undefined;
  mobileQuery?: string | undefined;
  shortcut?: boolean | undefined;
  sticky?: boolean | undefined;
  contentAs?: string | undefined;
  skipLink?: boolean | undefined;
  skipLabel?: string | undefined;
}

export interface NuiAppBarProps {
  sticky?: boolean | undefined;
}
