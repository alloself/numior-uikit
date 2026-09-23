import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { NuiTabsActivation, NuiTabsOrientation } from './tabs.types';

export interface TabsContext {
  readonly modelValue: Readonly<Ref<string | undefined>>;
  readonly activation: ComputedRef<NuiTabsActivation>;
  readonly orientation: ComputedRef<NuiTabsOrientation>;
  readonly lazy: ComputedRef<boolean>;
  select(value: string): void;
  seen(value: string): boolean;
  tabId(value: string): string;
  panelId(value: string): string;
}

const TABS_KEY: InjectionKey<TabsContext> = Symbol('nui:tabs');

export const provideTabs = (context: TabsContext): void => {
  provide(TABS_KEY, context);
};

export const useTabs = (): TabsContext => {
  const context = inject(TABS_KEY, null);
  if (context === null) {
    throw new Error('Tab parts must be rendered inside NuiTabs');
  }
  return context;
};
