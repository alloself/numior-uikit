export interface NuiTocItem {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly NuiTocItem[] | undefined;
}

export interface NuiTocProps {
  items: readonly NuiTocItem[];
  title?: string | undefined;
  label?: string | undefined;
  root?: Element | null | undefined;
  rootMargin?: string | undefined;
}

export interface NuiTocEntriesProps {
  items: readonly NuiTocItem[];
  activeId: string | undefined;
  depth: number;
}
