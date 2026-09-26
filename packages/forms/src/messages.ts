import type { NuiFormMessages } from './components/form/form.messages';
import type { NuiFormRulesMessages } from './rules/form-rules.messages';

export interface NuiFormsMessages {
  readonly form: NuiFormMessages;
  readonly formRules: NuiFormRulesMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiFormsMessages {}
}
