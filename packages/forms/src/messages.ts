import type { NuiFieldArrayMessages } from './components/field-array/field-array.messages';
import type { NuiFormMessages } from './components/form/form.messages';
import type { NuiFormRulesMessages } from './rules/form-rules.messages';

export interface NuiFormsMessages {
  readonly fieldArray: NuiFieldArrayMessages;
  readonly form: NuiFormMessages;
  readonly formRules: NuiFormRulesMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiFormsMessages {}
}
