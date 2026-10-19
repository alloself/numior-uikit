import type { IconSource } from '@numior/primitives';

export interface NuiRowProps {
  title?: string | undefined;
  description?: string | undefined;
  icon?: IconSource | false | undefined;
  check?: boolean | undefined;
  nowrap?: boolean | undefined;
  inline?: boolean | undefined;
}
