import type { NuiRouteLocation } from '../shared/destination';
import {
  computed,
  inject,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
} from 'vue';
import { type CardActionKind } from './card.types';

export type CardAction =
  | {
      readonly kind: typeof CardActionKind.Link;
      readonly href: string | undefined;
      readonly to: NuiRouteLocation | undefined;
      readonly as?: string | Component | undefined;
    }
  | { readonly kind: typeof CardActionKind.Button };

export interface CardContext {
  readonly action: ComputedRef<CardAction | undefined>;
  readonly loading: ComputedRef<boolean>;
}

const CARD_KEY: InjectionKey<CardContext> = Symbol('nui:card');

export const provideCard = (context: CardContext): void => {
  provide(CARD_KEY, context);
};

export const useCard = (): CardContext | null => inject(CARD_KEY, null);

export const useCardLoading = (): ComputedRef<boolean> => {
  const card = useCard();

  return computed(() => card?.loading.value ?? false);
};
