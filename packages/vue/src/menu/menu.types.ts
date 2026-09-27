import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';
import type { FloatingPlacement, IconAlias, PopoverInvokerAttrs } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export type NuiMenuItemTone = 'neutral' | 'error';

export interface NuiMenuItemEntry {
  readonly type?: 'item' | undefined;
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconAlias | undefined;
  readonly shortcut?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly tone?: NuiMenuItemTone | undefined;
  readonly href?: string | undefined;
  readonly to?: NuiRouteLocation | undefined;
  readonly as?: string | Component | undefined;
  readonly closeOnSelect?: boolean | undefined;
  readonly onSelect?: (() => void) | undefined;
}

export interface NuiMenuCheckboxEntry {
  readonly type: 'checkbox';
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconAlias | undefined;
  readonly disabled?: boolean | undefined;
  readonly checked: boolean;
  readonly closeOnSelect?: boolean | undefined;
  readonly onCheckedChange: (checked: boolean) => void;
}

export interface NuiMenuRadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean | undefined;
}

export interface NuiMenuRadioGroupEntry {
  readonly type: 'radio-group';
  readonly key?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly items: readonly NuiMenuRadioOption[];
}

export interface NuiMenuSeparatorEntry {
  readonly type: 'separator';
  readonly key?: string | undefined;
}

export interface NuiMenuLabelEntry {
  readonly type: 'label';
  readonly key?: string | undefined;
  readonly label: string;
}

export interface NuiMenuSubEntry {
  readonly type: 'sub';
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconAlias | undefined;
  readonly disabled?: boolean | undefined;
  readonly items: readonly NuiMenuEntry[];
}

export type NuiMenuEntry =
  | NuiMenuItemEntry
  | NuiMenuCheckboxEntry
  | NuiMenuRadioGroupEntry
  | NuiMenuSeparatorEntry
  | NuiMenuLabelEntry
  | NuiMenuSubEntry;

export interface NuiMenuProps {
  id?: string | undefined;
  placement?: FloatingPlacement | undefined;
  offset?: number | undefined;
  items?: readonly NuiMenuEntry[] | undefined;
  closeOnSelect?: boolean | undefined;
  loop?: boolean | undefined;
  typeahead?: boolean | undefined;
  label?: string | undefined;
}

export interface NuiMenuTriggerAttrs extends PopoverInvokerAttrs {
  readonly id: string;
  readonly 'aria-haspopup': 'menu';
  readonly ref: NuiTriggerRef;
  readonly onKeydown: (event: KeyboardEvent) => void;
}

export interface NuiMenuTriggerSlot {
  readonly attrs: NuiMenuTriggerAttrs;
  readonly open: boolean;
}

export interface NuiMenuItemProps {
  icon?: IconAlias | undefined;
  shortcut?: string | undefined;
  disabled?: boolean | undefined;
  tone?: NuiMenuItemTone | undefined;
  closeOnSelect?: boolean | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
}

export interface NuiMenuCheckboxItemProps {
  icon?: IconAlias | undefined;
  disabled?: boolean | undefined;
  closeOnSelect?: boolean | undefined;
}

export interface NuiMenuRadioItemProps<T> {
  value: T;
  disabled?: boolean | undefined;
  closeOnSelect?: boolean | undefined;
}

export interface NuiMenuSubProps {
  id?: string | undefined;
  label?: string | undefined;
  icon?: IconAlias | undefined;
  disabled?: boolean | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
}

export interface NuiMenuRowProps {
  icon?: IconAlias | undefined;
  shortcut?: string | undefined;
}
