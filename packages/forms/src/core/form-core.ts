import { useMessages } from '@numior/primitives';
import { shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { FormEngine, FormEngineFactory } from '../engine/engine.types';
import { createFormEngine } from '../engine/form-engine';
import { formRulesMessages, type NuiFormRulesMessages } from '../rules/form-rules.messages';
import type { StandardSchema } from '../schema/standard';
import { cloneValue } from '../values/clone';
import { createRegistry, type Registry } from './registry';
import { createRuleLookup, type FormRules, type PathRules } from './rules';
import { createTracker, type Tracker } from './tracker';
import { ValidateOn, type CheckErrorHandler, type FormMessage } from './form.types';
import { SubmissionPhase } from './core.types';

export interface ExternalError {
  readonly messages: readonly string[];
  readonly snapshot: unknown;
}

export interface RetainedState {
  readonly touched: boolean;
  readonly attempted: boolean;
  readonly errors: readonly string[];
  readonly value: unknown;
}

export interface Session {
  epoch: number;
  started: number;
  applied: number;
  shape: number;
  formAttempted: boolean;
}

export type Submission =
  | { readonly phase: typeof SubmissionPhase.Idle }
  | { readonly phase: typeof SubmissionPhase.Running; readonly controller: AbortController }
  | { readonly phase: typeof SubmissionPhase.Succeeded };

export interface FormCoreOptions<V extends object, O> {
  readonly initialValues: V;
  readonly schema?: StandardSchema<unknown, O> | undefined;
  readonly rules?: FormRules<V> | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly engine?: FormEngineFactory | undefined;
  readonly onCheckError?: CheckErrorHandler | undefined;
}

export interface FormCore<V extends object, O> {
  readonly engine: FormEngine<V>;
  readonly registry: Registry<V>;
  readonly tracker: Tracker;
  readonly schema: StandardSchema<unknown, O> | undefined;
  readonly rulesAt: (path: string) => PathRules<V>;
  readonly validateOn: ValidateOn;
  readonly onCheckError: CheckErrorHandler | undefined;
  readonly messages: ComputedRef<NuiFormRulesMessages>;
  readonly initial: ShallowRef<V>;
  readonly schemaFormErrors: ShallowRef<readonly FormMessage[]>;
  readonly serverFormErrors: ShallowRef<readonly FormMessage[]>;
  readonly submission: ShallowRef<Submission>;
  readonly external: Map<string, ExternalError>;
  readonly retained: Map<string, RetainedState>;
  readonly session: Session;
}

export const IDLE_SUBMISSION: Submission = { phase: SubmissionPhase.Idle };

export const createFormCore = <V extends object, O>(
  options: FormCoreOptions<V, O>,
): FormCore<V, O> => ({
  engine: (options.engine ?? createFormEngine)(options.initialValues),
  registry: createRegistry(),
  tracker: createTracker(),
  schema: options.schema,
  rulesAt: createRuleLookup(options.rules ?? {}),
  validateOn: options.validateOn ?? ValidateOn.Submit,
  onCheckError: options.onCheckError,
  messages: useMessages(formRulesMessages),
  initial: shallowRef(cloneValue(options.initialValues)),
  schemaFormErrors: shallowRef<readonly FormMessage[]>([]),
  serverFormErrors: shallowRef<readonly FormMessage[]>([]),
  submission: shallowRef<Submission>(IDLE_SUBMISSION),
  external: new Map(),
  retained: new Map(),
  session: { epoch: 0, started: 0, applied: 0, shape: 0, formAttempted: false },
});
