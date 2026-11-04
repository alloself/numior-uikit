import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';
import { Direction } from './direction.types';

export interface DirectionControl {
  dir(): Direction;
  isRtl(): boolean;
}

export const DIRECTION_KEY: InjectionKey<ComputedRef<Direction | undefined>> =
  Symbol('nui:direction');

const DIRECTIONS: ReadonlySet<string | null | undefined> = new Set(Object.values(Direction));

const isDirection = (value: string | null | undefined): value is Direction => DIRECTIONS.has(value);

const directionOf = (value: string | null | undefined): Direction | undefined =>
  isDirection(value) ? value : undefined;

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

    return nearest ?? documentDirection() ?? Direction.Ltr;
  };

  return { dir, isRtl: () => dir() === Direction.Rtl };
};
