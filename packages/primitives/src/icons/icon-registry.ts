import { defineAsyncComponent, inject, provide, type Component, type InjectionKey } from 'vue';
import type { iconAliases } from './icon-aliases';

export type IconAlias = keyof typeof iconAliases;

export type IconSource = IconAlias | Component;

export type IconRegistry = Readonly<Partial<Record<IconAlias, Component>>>;

export type IconLoader = () => Promise<Component | { default: Component }>;

export const ICONS_KEY: InjectionKey<IconRegistry> = Symbol('nui:icons');

const EMPTY: IconRegistry = Object.freeze({});

export const provideIcons = (registry: IconRegistry): IconRegistry => {
  const merged: IconRegistry = { ...inject(ICONS_KEY, EMPTY), ...registry };
  provide(ICONS_KEY, merged);
  return merged;
};

export const useIcons = (): IconRegistry => {
  return inject(ICONS_KEY, EMPTY);
};

export const lazyIcon = (loader: IconLoader): Component => {
  return defineAsyncComponent<Component>({ loader, suspensible: false });
};
