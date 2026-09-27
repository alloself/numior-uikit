import { inject, provide, type InjectionKey, type Ref } from 'vue';
import type { NuiCollapsibleVariant, NuiHeadingLevel } from '../collapsible/collapsible.types';

export interface AccordionContext {
  readonly variant: Ref<NuiCollapsibleVariant>;
  readonly headingLevel: Ref<NuiHeadingLevel | undefined>;
  readonly disabled: Ref<boolean>;
  isOpen(value: string): boolean;
  toggle(value: string, open: boolean): void;
}

const ACCORDION_KEY: InjectionKey<AccordionContext> = Symbol('nui-accordion');

export const provideAccordion = (context: AccordionContext): void => {
  provide(ACCORDION_KEY, context);
};

export const useAccordion = (): AccordionContext => {
  const context = inject(ACCORDION_KEY, null);

  if (!context) {
    throw new Error('NuiAccordionItem must be rendered inside NuiAccordion');
  }
  return context;
};
