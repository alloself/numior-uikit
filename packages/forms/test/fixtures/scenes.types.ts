import type { AnyFieldRule, FieldFlush, FormField, ValidateOn } from '../../src';

export type Lookup = 'injected' | 'provided';

export interface Names {
  readonly name: string;
}

export interface EngineProbe {
  readonly name: string;
  path: string;
  visible: boolean;
}

export interface Contact {
  name: string;
}

export interface Team {
  title: string;
  contacts: Contact[];
}

export interface Contacts {
  contacts: Contact[];
}

export interface RowProbes {
  readonly rows: Map<string, FormField<string | undefined>>;
  readonly work: Map<string, Promise<void>>;
}

export interface FieldSpec {
  readonly path: string;
  readonly validateOn?: ValidateOn;
  readonly keepValue?: boolean;
  readonly debounce?: number;
  readonly rules?: readonly AnyFieldRule[];
  readonly label?: string;
  readonly flush?: FieldFlush;
}

export interface FieldView {
  readonly hidden: Set<string>;
  readonly inactive: Set<string>;
  readonly disabled: Set<string>;
}

export interface FieldProbes {
  readonly fields: Map<string, FormField<unknown>>;
  readonly work: Map<string, Promise<void>>;
}

export type ControlKind = 'input' | 'select' | 'checkbox' | 'number';

export interface FormFieldConfig {
  readonly path: string;
  readonly label: string;
  readonly control?: ControlKind;
  readonly rules?: readonly AnyFieldRule[];
  readonly validateOn?: ValidateOn;
  readonly keepValue?: boolean;
  readonly readonly?: boolean;
}

export interface FormView {
  readonly hidden: Set<string>;
  readonly rules: Map<string, readonly AnyFieldRule[]>;
  readonly validateOn: Map<string, ValidateOn>;
  disabled: boolean;
  readonly: boolean;
}

export type SmartFormPart =
  | 'kind-options'
  | 'bio-hint'
  | 'row-hint'
  | 'action-state'
  | 'step-state';
