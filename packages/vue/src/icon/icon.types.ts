import type { Component } from 'vue';
import type { IconAlias } from '@numior/primitives';

export interface NuiIconProps {
  alias?: IconAlias | undefined;
  icon?: Component | undefined;
}
