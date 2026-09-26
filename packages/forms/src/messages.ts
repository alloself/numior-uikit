import type { NuiFormRulesMessages } from './rules/form-rules.messages';

export interface NuiFormsMessages {
  readonly formRules: NuiFormRulesMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiFormsMessages {}
}
