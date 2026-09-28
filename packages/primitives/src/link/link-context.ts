import { inject, provide, type Component, type InjectionKey } from 'vue';

export type NuiLinkComponent = string | Component;

export const LINK_KEY: InjectionKey<NuiLinkComponent> = Symbol('nui:link');

export const provideLink = (link: NuiLinkComponent): void => {
  provide(LINK_KEY, link);
};

export const useConfiguredLink = (): NuiLinkComponent | null => inject(LINK_KEY, null);
