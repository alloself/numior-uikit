import type { IconSource } from '@numior/primitives';

export interface NuiIconProps {
  icon?: IconSource | undefined;
  transform?: NuiIconTransform | undefined;
  filled?: boolean | undefined;
}

export interface NuiIconTransform {
  readonly rotate?: number | undefined;
  readonly scale?: number | undefined;
}
