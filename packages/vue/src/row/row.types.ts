import type { IconAlias } from '@numior/primitives';

export interface NuiRowProps {
  title?: string | undefined;
  description?: string | undefined;
  icon?: IconAlias | undefined;
  check?: boolean | undefined;
  nowrap?: boolean | undefined;
  inline?: boolean | undefined;
}
