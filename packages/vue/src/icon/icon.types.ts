import type { Component } from 'vue';
import type { IconAlias } from '@numior/primitives';

export interface NuiIconProps {
  icon?: IconAlias | Component | undefined;
  transform?: NuiIconTransform | undefined;
}

export interface NuiIconTransform {
  readonly rotate?: number | undefined;
  readonly scale?: number | undefined;
}
