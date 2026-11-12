import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { ElementCollection } from '@numior/primitives';
import type { MenuFocusRequest } from './menu.types';

export interface MenuContext {
  readonly level: number;
  readonly items: ElementCollection<symbol>;
  readonly closeOnSelect: ComputedRef<boolean>;
  close(): void;
  closeAll(): void;
  requestFocus(target: MenuFocusRequest): void;
}

export interface MenuRadioContext<T = unknown> {
  readonly modelValue: Ref<T | undefined>;
  readonly selectedKey: ComputedRef<string | undefined>;
  keyOf(value: T): string;
  select(value: T): void;
}

const MENU_KEY: InjectionKey<MenuContext> = Symbol('nui:menu');
const MENU_RADIO_KEY: InjectionKey<MenuRadioContext> = Symbol('nui:menu-radio');

export const provideMenu = (context: MenuContext): void => {
  provide(MENU_KEY, context);
};

export const useMenu = (): MenuContext => {
  const context = inject(MENU_KEY, null);
  if (context === null) {
    throw new Error('Menu parts must be rendered inside NuiMenu');
  }
  return context;
};

export const provideMenuRadio = <T>(context: MenuRadioContext<T>): void => {
  provide(MENU_RADIO_KEY, context);
};

export const useMenuRadio = (): MenuRadioContext => {
  const context = inject(MENU_RADIO_KEY, null);
  if (context === null) {
    throw new Error('NuiMenuRadioItem must be rendered inside NuiMenuRadioGroup');
  }
  return context;
};
