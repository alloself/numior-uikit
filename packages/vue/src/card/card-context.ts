import { inject, provide, type Component, type ComputedRef, type InjectionKey } from 'vue';

export type CardAction =
  | {
      readonly kind: 'link';
      readonly href: string | undefined;
      readonly to: unknown;
      readonly as: string | Component;
    }
  | { readonly kind: 'button' };

export interface CardContext {
  readonly action: ComputedRef<CardAction | undefined>;
}

const CARD_KEY: InjectionKey<CardContext> = Symbol('nui:card');

export const provideCard = (context: CardContext): void => {
  provide(CARD_KEY, context);
};

export const useCard = (): CardContext | null => inject(CARD_KEY, null);
