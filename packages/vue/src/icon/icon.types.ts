import type { Component } from 'vue';
import type { IconAlias } from '@numior/primitives';

export interface NuiIconProps {
  /** Alias resolved through the provided icon registry, then the kit defaults. */
  alias?: IconAlias | undefined;
  /** Explicit icon component; wins over the alias. */
  icon?: Component | undefined;
}
