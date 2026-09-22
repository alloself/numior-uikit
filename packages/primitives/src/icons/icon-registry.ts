import {
  computed,
  inject,
  provide,
  toValue,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

/** Aliases the kit's own components resolve; any other string is a consumer-defined alias. */
export type IconAlias =
  | 'check'
  | 'minus'
  | 'loader'
  | 'chevron-down'
  | 'x'
  | 'search'
  | (string & NonNullable<unknown>);

export type IconRegistry = Readonly<Record<string, Component>>;

export const ICONS_KEY: InjectionKey<IconRegistry> = Symbol('nui:icons');

const EMPTY: IconRegistry = Object.freeze({});

/** Provide aliases for descendants, layered over any registry provided further up. */
export function provideIcons(registry: IconRegistry): IconRegistry {
  const merged: IconRegistry = { ...inject(ICONS_KEY, EMPTY), ...registry };
  provide(ICONS_KEY, merged);
  return merged;
}

export function useIcons(): IconRegistry {
  return inject(ICONS_KEY, EMPTY);
}

export function useIcon(
  alias: MaybeRefOrGetter<IconAlias | undefined>,
): ComputedRef<Component | undefined> {
  const icons = useIcons();
  return computed(() => {
    const key = toValue(alias);
    return key === undefined ? undefined : icons[key];
  });
}
