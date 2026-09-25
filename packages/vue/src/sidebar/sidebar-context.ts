import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { FloatingPlacement } from '@numior/primitives';

export interface SidebarContext {
  readonly rail: ComputedRef<boolean>;
  readonly mobile: Readonly<Ref<boolean>>;
  tooltipPlacement(): FloatingPlacement;
  expand(): void;
  closeMobile(): void;
}

const SIDEBAR_KEY: InjectionKey<SidebarContext> = Symbol('nui:sidebar');

export const provideSidebar = (context: SidebarContext): void => {
  provide(SIDEBAR_KEY, context);
};

export const useSidebar = (): SidebarContext => {
  const context = inject(SIDEBAR_KEY, null);

  if (context === null) {
    throw new Error('Sidebar items must be rendered inside NuiSidebar');
  }

  return context;
};
