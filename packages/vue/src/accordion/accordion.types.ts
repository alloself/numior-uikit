import type { NuiCollapsibleVariant, NuiHeadingLevel } from '../collapsible/collapsible.types';

export interface NuiAccordionProps {
  id?: string | undefined;
  multiple?: boolean | undefined;
  collapsible?: boolean | undefined;
  variant?: NuiCollapsibleVariant | undefined;
  headingLevel?: NuiHeadingLevel | undefined;
  disabled?: boolean | undefined;
}

export interface NuiAccordionItemProps {
  value: string;
  label?: string | undefined;
  disabled?: boolean | undefined;
}
