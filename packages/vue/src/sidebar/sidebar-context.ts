import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { FloatingPlacement } from '@numior/primitives';

export interface SidebarContext {
  readonly rail: ComputedRef<boolean>;
  readonly mobile: Readonly<Ref<boolean>>;
  tooltipPlacement(): FloatingPlacement;
  expand(): void;
  closeMobile(): void;
}

export interface SidebarSubContext {
  reveal(): void;
  revealAtStart(): void;
  dismiss(): void;
}

const SIDEBAR_KEY: InjectionKey<SidebarContext> = Symbol('nui:sidebar');
const SIDEBAR_SUB_KEY: InjectionKey<SidebarSubContext> = Symbol('nui:sidebar-sub');

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

export const provideSidebarSub = (context: SidebarSubContext): void => {
  provide(SIDEBAR_SUB_KEY, context);
};

export const useSidebarSub = (): SidebarSubContext | null => inject(SIDEBAR_SUB_KEY, null);
