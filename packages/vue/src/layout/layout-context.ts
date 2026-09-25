import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export interface LayoutContext {
  readonly open: Ref<boolean>;
  readonly mobileOpen: Ref<boolean>;
  readonly mobile: Readonly<Ref<boolean>>;
  readonly sidebarId: ComputedRef<string>;
  toggle(): void;
}

const LAYOUT_KEY: InjectionKey<LayoutContext> = Symbol('nui:layout');

export const provideLayout = (context: LayoutContext): void => {
  provide(LAYOUT_KEY, context);
};

export const useLayout = (): LayoutContext => {
  const context = inject(LAYOUT_KEY, null);

  if (context === null) {
    throw new Error('Sidebar parts must be rendered inside NuiLayout');
  }

  return context;
};
