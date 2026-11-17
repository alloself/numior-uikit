import { isVNode, type VNode } from 'vue';

export type ContentPart = VNode | string;

export interface LeadingPart {
  readonly lead: VNode | undefined;
  readonly rest: readonly ContentPart[];
}

export const splitLead = (parts: readonly ContentPart[]): LeadingPart => {
  const [first] = parts;

  return isVNode(first) ? { lead: first, rest: parts.slice(1) } : { lead: undefined, rest: parts };
};
