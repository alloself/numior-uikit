import { normalizePath } from '../paths/paths';
import type { SubmittedValues } from '../paths/paths.types';
import type { ErrorControls } from './errors';
import { NuiFormError } from './form-error';
import { IDLE_SUBMISSION, type FormCore } from './form-core';
import type { FormHost } from './host';
import { toMessages } from './messages';
import type { FormMessage, ResetOptions, SubmitResult, SubmitStatus } from './form.types';
import { isPrunedFrom } from './prune';
import { isClean, type RunResult, type Validation } from './validation';

export interface SubmitHelpers<V, O> {
  readonly output: O | undefined;
  readonly signal: AbortSignal;
  setErrors(errors: Readonly<Record<string, string | readonly string[] | undefined>>): void;
  setFieldError(path: string, message: string | readonly string[] | undefined): void;
  setFormErrors(messages: readonly string[]): void;
  resetForm(options?: ResetOptions<V>): void;
}

export type SubmitHandler<V, O> = (
  values: SubmittedValues<V>,
  helpers: SubmitHelpers<V, O>,
) => unknown;

export interface SubmitDeps<V extends object, O> {
  readonly core: FormCore<V, O>;
  readonly validation: Validation<V, O>;
  readonly host: FormHost<V>;
  readonly errors: ErrorControls;
  readonly onSubmit: SubmitHandler<V, O>;
  readonly helpers: Omit<SubmitHelpers<V, O>, 'output' | 'signal'>;
  readonly invalid: () => readonly string[];
  readonly formErrors: () => readonly FormMessage[];
}

const IGNORED: SubmitResult = { status: 'ignored', invalid: [], formErrors: [] };

const payloadOf = <V, O>({ submitted, baseline }: RunResult<V, O>): SubmittedValues<V> => {
  if (baseline === undefined || !isPrunedFrom(submitted, baseline)) {
    throw new Error('The submitted values do not come from the form values');
  }
  return submitted;
};

export const createSubmit = <V extends object, O>(deps: SubmitDeps<V, O>) => {
  const { core } = deps;

  const outcome = (status: SubmitStatus): SubmitResult => ({
    status,
    invalid: deps.invalid(),
    formErrors: deps.formErrors(),
  });

  const attemptAll = (): void => {
    core.engine.countSubmit();
    core.session.formAttempted = true;

    for (const entry of core.registry.all()) {
      entry.state.setTouched(true);
      entry.state.setAttempted(true);
    }
  };

  const reject = (error: NuiFormError): void => {
    const formMessages: string[] = [];

    for (const [path, messages] of Object.entries(error.errors)) {
      if (normalizePath(path) === '') {
        formMessages.push(...toMessages(messages));
      } else {
        deps.errors.setFieldError(path, toMessages(messages));
      }
    }

    deps.errors.setFormErrors(
      error.message === '' ? formMessages : [...formMessages, error.message],
    );
  };

  const deliver = async (
    epoch: number,
    result: RunResult<V, O>,
    signal: AbortSignal,
  ): Promise<SubmitResult> => {
    try {
      await deps.onSubmit(payloadOf(result), { ...deps.helpers, output: result.output, signal });
    } catch (error) {
      if (!(error instanceof NuiFormError)) {
        throw error;
      }
      if (epoch !== core.session.epoch) {
        return outcome('aborted');
      }
      reject(error);
      return outcome('rejected');
    }
    if (epoch !== core.session.epoch) {
      return outcome('aborted');
    }
    if (deps.errors.hasServerErrors()) {
      return outcome('rejected');
    }
    if (result.baseline !== undefined) {
      core.initial.value = result.baseline;
    }
    return outcome('submitted');
  };

  const attempt = async (epoch: number, signal: AbortSignal): Promise<SubmitResult> => {
    await deps.host.flush(core.registry.active());

    if (epoch !== core.session.epoch) {
      return outcome('aborted');
    }
    attemptAll();

    const result = await deps.validation.validateFully(core.registry.active());

    if (epoch !== core.session.epoch) {
      return outcome('aborted');
    }
    return isClean(result) ? deliver(epoch, result, signal) : outcome('invalid');
  };

  return (event?: Event): Promise<SubmitResult> => {
    event?.preventDefault();

    if (core.submission.value.phase === 'running') {
      return Promise.resolve(IGNORED);
    }

    const controller = new AbortController();
    const { epoch } = core.session;

    core.submission.value = { phase: 'running', controller };
    deps.errors.clearServerErrors();

    const settle = (result: SubmitResult): SubmitResult => {
      if (epoch === core.session.epoch) {
        core.submission.value =
          result.status === 'submitted' ? { phase: 'succeeded' } : IDLE_SUBMISSION;
      }
      return result;
    };

    const fail = (error: unknown): never => {
      if (epoch === core.session.epoch) {
        core.submission.value = IDLE_SUBMISSION;
      }
      throw error;
    };

    return core.tracker.track(attempt(epoch, controller.signal).then(settle, fail));
  };
};
