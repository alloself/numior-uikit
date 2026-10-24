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

const loading = new WeakMap<Component, { done: boolean }>();

export const lazyIcon = (loader: IconLoader): Component => {
  const state = { done: false };

  const icon = defineAsyncComponent<Component>({
    loader: async () => {
      const glyph = await loader();

      state.done = true;
      return glyph;
    },
    suspensible: false,
  });

  loading.set(icon, state);
  return icon;
};

export const iconPending = (icon: Component | undefined): boolean =>
  icon !== undefined && loading.get(icon)?.done === false;
