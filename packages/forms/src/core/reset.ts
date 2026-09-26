import { cloneValue } from '../values/clone';
import type { FormCore } from './form-core';
import { writeErrors } from './messages';
import type { Entry } from './registry';
import type { ResetOptions } from './types';

const clearState = (entry: Entry): void => {
  entry.fieldEpoch += 1;
  entry.state.setTouched(false);
  entry.state.setAttempted(false);
  entry.state.setPending(false);
  writeErrors(entry.state, []);
};

export const createReset =
  <V extends object, O>(core: FormCore<V, O>) =>
  (options: ResetOptions<V> = {}): void => {
    const entries = core.registry.entries.value;

    const kept = options.keepErrors
      ? entries.map((entry) => [entry, entry.state.errors.value] as const)
      : [];

    core.session.epoch += 1;
    core.session.controller?.abort();
    core.session.controller = undefined;
    core.initial.value = cloneValue(options.values ?? core.initial.value);
    core.engine.reset(core.initial.value);
    core.retained.clear();
    core.submitting.value = false;
    core.submitted.value = false;
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
