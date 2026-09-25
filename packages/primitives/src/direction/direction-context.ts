import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

export type Direction = 'ltr' | 'rtl';

export interface DirectionControl {
  dir(): Direction;
  isRtl(): boolean;
}

export const DIRECTION_KEY: InjectionKey<ComputedRef<Direction | undefined>> =
  Symbol('nui:direction');

const directionOf = (value: string | null | undefined): Direction | undefined =>
  value === 'rtl' || value === 'ltr' ? value : undefined;

const documentDirection = (): Direction | undefined =>
  typeof document === 'undefined' ? undefined : directionOf(document.documentElement.dir);

export const provideDirection = (dir: MaybeRefOrGetter<Direction | undefined>): void => {
  provide(
    DIRECTION_KEY,
    computed(() => toValue(dir)),
  );
};

export const useDirection = (
  anchor?: MaybeRefOrGetter<HTMLElement | null | undefined>,
): DirectionControl => {
  const configured = inject(DIRECTION_KEY, null);

  const dir = (): Direction => {
    const explicit = configured?.value;

    if (explicit) {
      return explicit;
    }

    const element = toValue(anchor);
    const nearest = directionOf(element?.closest('[dir]')?.getAttribute('dir'));

    return nearest ?? documentDirection() ?? 'ltr';
  };

  return { dir, isRtl: () => dir() === 'rtl' };
};
