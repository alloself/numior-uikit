import {
  computed,
  defineAsyncComponent,
  inject,
  provide,
  toValue,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

export type IconAlias =
  | 'check'
  | 'minus'
  | 'loader'
  | 'chevron-down'
  | 'x'
  | 'search'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'ellipsis'
  | 'external-link'
  | 'user'
  | 'image'
  | 'inbox'
  | 'folder'
  | 'folder-open'
  | 'file'
  | 'arrow-up'
  | 'arrow-up-down'
  | 'grip'
  | 'plus'
  | 'clock'
  | 'calendar'
  | 'upload'
  | 'refresh'
  | (string & NonNullable<unknown>);

export type IconRegistry = Readonly<Record<string, Component>>;

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

export const useIcon = (
  alias: MaybeRefOrGetter<IconAlias | undefined>,
): ComputedRef<Component | undefined> => {
  const icons = useIcons();
  return computed(() => {
    const key = toValue(alias);
    return key === undefined ? undefined : icons[key];
  });
};

export const lazyIcon = (loader: IconLoader): Component => {
  return defineAsyncComponent<Component>({ loader, suspensible: false });
};
