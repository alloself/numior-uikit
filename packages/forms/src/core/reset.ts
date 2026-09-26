import { cloneValue } from '../values/clone';
import { IDLE_SUBMISSION, type FormCore } from './form-core';
import { writeErrors } from './messages';
import type { AnyEntry } from './registry';
import type { ResetOptions } from './form.types';
import type { Validation } from './validation';

const clearState = (entry: AnyEntry): void => {
  entry.fieldEpoch += 1;
  entry.state.setTouched(false);
  entry.state.setAttempted(false);
  entry.state.setPending(false);
  writeErrors(entry.state, []);
};

export const createReset =
  <V extends object, O>(core: FormCore<V, O>, validation: Validation<V, O>) =>
  (options: ResetOptions<V> = {}): void => {
    const entries = [...core.registry.all()];

    const kept = options.keepErrors
      ? entries.map((entry) => [entry, entry.state.errors.value] as const)
      : [];

    const submission = core.submission.value;

    core.session.epoch += 1;

    if (submission.phase === 'running') {
      submission.controller.abort();
    }
    validation.async.reset();
    core.initial.value = cloneValue(options.values ?? core.initial.value);
    core.engine.reset(core.initial.value);
    core.retained.clear();
    core.submission.value = IDLE_SUBMISSION;
    entries.forEach(clearState);

    for (const [entry, errors] of kept) {
      entry.state.setAttempted(errors.length > 0);
      writeErrors(entry.state, errors);
    }
    if (!options.keepErrors) {
      core.session.formAttempted = false;
      core.external.clear();
      core.schemaFormErrors.value = [];
      core.serverFormErrors.value = [];
    }
  };
