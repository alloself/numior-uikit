export type NuiTocMarker = (typeof NuiTocMarker)[keyof typeof NuiTocMarker];

export interface NuiTocItem {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly NuiTocItem[] | undefined;
}

export interface NuiTocProps {
  items: readonly NuiTocItem[];
  title?: string | undefined;
  label?: string | undefined;
  root?: HTMLElement | null | undefined;
  line?: number | undefined;
  marker?: NuiTocMarker | undefined;
}

export interface NuiTocEntriesProps {
  items: readonly NuiTocItem[];
  activeId: string | undefined;
  depth: number;
}

export const NuiTocMarker = { Line: 'line', Square: 'square' } as const;
