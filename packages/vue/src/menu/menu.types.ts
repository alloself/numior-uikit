import type { NuiRouteLocation } from '../shared/destination';
import { NuiTone } from '../shared/scale.types';
import type { Component } from 'vue';
import type { FloatingPlacement, IconSource, PopoverInvokerAttrs } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export type NuiMenuItemTone = (typeof NuiMenuItemTone)[keyof typeof NuiMenuItemTone];

export interface NuiMenuItemEntry {
  readonly type?: typeof NuiMenuEntryType.Item | undefined;
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconSource | undefined;
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
  readonly type: typeof NuiMenuEntryType.Checkbox;
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconSource | undefined;
  readonly disabled?: boolean | undefined;
  readonly checked: boolean;
  readonly closeOnSelect?: boolean | undefined;
  readonly onCheckedChange: (checked: boolean) => void;
}

export interface NuiMenuRadioOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconSource | undefined;
  readonly disabled?: boolean | undefined;
}

export interface NuiMenuRadioGroupEntry {
  readonly type: typeof NuiMenuEntryType.RadioGroup;
  readonly key?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly items: readonly NuiMenuRadioOption[];
}

export interface NuiMenuSeparatorEntry {
  readonly type: typeof NuiMenuEntryType.Separator;
  readonly key?: string | undefined;
}

export interface NuiMenuLabelEntry {
  readonly type: typeof NuiMenuEntryType.Label;
  readonly key?: string | undefined;
  readonly label: string;
}

export interface NuiMenuSubEntry {
  readonly type: typeof NuiMenuEntryType.Sub;
  readonly key?: string | undefined;
  readonly label: string;
  readonly icon?: IconSource | undefined;
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
  anchor?: HTMLElement | null | undefined;
  compact?: boolean | undefined;
  lazy?: boolean | undefined;
}

export type NuiMenuFocus = (typeof NuiMenuFocus)[keyof typeof NuiMenuFocus];

export type MenuFocusRequest = (typeof MenuFocusRequest)[keyof typeof MenuFocusRequest];

export interface NuiMenuExposed {
  readonly triggerElement: HTMLElement | null;
  show(focus?: NuiMenuFocus): void;
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
  icon?: IconSource | undefined;
  shortcut?: string | undefined;
  disabled?: boolean | undefined;
  tone?: NuiMenuItemTone | undefined;
  closeOnSelect?: boolean | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
}

export interface NuiMenuCheckboxItemProps {
  icon?: IconSource | undefined;
  disabled?: boolean | undefined;
  closeOnSelect?: boolean | undefined;
}

export interface NuiMenuRadioItemProps<T> {
  value: T;
  icon?: IconSource | undefined;
  disabled?: boolean | undefined;
  closeOnSelect?: boolean | undefined;
}

export interface NuiMenuSubProps {
  id?: string | undefined;
  label?: string | undefined;
  icon?: IconSource | undefined;
  disabled?: boolean | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
}

export interface NuiMenuRowProps {
  icon?: IconSource | undefined;
  shortcut?: string | undefined;
}

export const NuiMenuItemTone = { Neutral: NuiTone.Neutral, Error: NuiTone.Error } as const;

export const NuiMenuFocus = { First: 'first', Last: 'last' } as const;

export const MenuFocusRequest = { ...NuiMenuFocus, None: 'none' } as const;

export const NuiMenuEntryType = {
  Item: 'item',
  Checkbox: 'checkbox',
  RadioGroup: 'radio-group',
  Separator: 'separator',
  Label: 'label',
  Sub: 'sub',
} as const;
