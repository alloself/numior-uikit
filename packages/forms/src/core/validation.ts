import { toOutcome, type FormIssue, type SchemaOutcome } from '../schema/standard';
import { getAt } from '../values/access';
import { cloneValue } from '../values/clone';
import { isEqualValue } from '../values/equal';
import type { FormCore } from './form-core';
import { chain, isPromise, type MaybePromise } from './maybe';
import { writeErrors } from './messages';
import { classifyIssues, type Classified } from './owners';
import { prune } from './prune';
import type { Entry } from './registry';
import { firstFailure, rulesFor } from './rules';

export interface RunResult<V, O> extends Classified {
  readonly input: V;
  readonly submitted: V;
  readonly output: O | undefined;
}

export interface Validation<V extends object, O> {
  run(): MaybePromise<RunResult<V, O>>;
  execute(): MaybePromise<RunResult<V, O>>;
  validateEntries(entries: readonly Entry[]): Promise<RunResult<V, O>>;
}

export const isClean = (result: Classified): boolean =>
  result.byOwner.size === 0 && result.formLevel.length === 0;

export const createValidation = <V extends object, O>(core: FormCore<V, O>): Validation<V, O> => {
  const ruleIssues = (submitted: V, active: readonly Entry[]): FormIssue[] =>
    active
      .filter((entry) => !entry.disabled())
      .flatMap((entry) => {
        const path = entry.path();
        const context = { name: path, label: entry.label(), values: submitted };
        const failure = firstFailure(rulesFor(core.rules, path), getAt(submitted, path), context);
        const message = failure ?? entry.check(context);

        return message === undefined ? [] : [{ path, message }];
      });

  const externalIssues = (): FormIssue[] =>
    [...core.external].flatMap(([path, error]) =>
      isEqualValue(getAt(core.engine.values, path), error.snapshot)
        ? error.messages.map((message) => ({ path, message }))
        : [],
    );

  const schemaOutcome = (submitted: V): MaybePromise<SchemaOutcome<O | undefined>> =>
    core.schema === undefined
      ? { ok: true, output: undefined }
      : chain(core.schema['~standard'].validate(submitted), toOutcome);

  const run = (): MaybePromise<RunResult<V, O>> => {
    const input = cloneValue(core.engine.values);
    const submitted = cloneValue(input);
    const active = core.registry.active();

    prune(submitted, core.registry.known, active);

    const extra = [...ruleIssues(submitted, active), ...externalIssues()];

    return chain(schemaOutcome(submitted), (outcome) => {
      const issues = outcome.ok ? extra : [...outcome.issues, ...extra];

      return {
        ...classifyIssues(issues, core.registry.active()),
        input,
        submitted,
        output: outcome.ok && issues.length === 0 ? outcome.output : undefined,
      };
    });
  };

  const dropStaleExternal = (): void => {
    for (const [path, error] of core.external) {
      if (!isEqualValue(getAt(core.engine.values, path), error.snapshot)) {
        core.external.delete(path);
      }
    }
  };

  const apply = (result: RunResult<V, O>): void => {
    for (const entry of core.registry.active()) {
      if (entry.state.attempted.value) {
        writeErrors(entry.state, result.byOwner.get(entry.path()) ?? []);
      }
    }
    if (core.session.formAttempted) {
      core.schemaFormErrors.value = result.formLevel;
    }
    dropStaleExternal();
  };

  const execute = (): MaybePromise<RunResult<V, O>> => {
    const epoch = core.session.epoch;

    core.session.started += 1;

    const order = core.session.started;

    const settle = (result: RunResult<V, O>): RunResult<V, O> => {
      if (epoch === core.session.epoch && order > core.session.applied) {
        core.session.applied = order;
        apply(result);
      }
      return result;
    };

    const outcome = chain(run(), settle);

    return isPromise(outcome) ? core.tracker.track(outcome) : outcome;
  };

  const pending = new Map<Entry, number>();

  const shiftPending = (entries: readonly Entry[], delta: number): void => {
    for (const entry of entries) {
      const count = (pending.get(entry) ?? 0) + delta;

      if (count > 0) {
        pending.set(entry, count);
      } else {
        pending.delete(entry);
      }
      entry.state.setPending(count > 0);
    }
  };

  const validateEntries = (entries: readonly Entry[]): Promise<RunResult<V, O>> => {
    for (const entry of entries) {
      entry.state.setAttempted(true);
    }

    const outcome = execute();

    if (!isPromise(outcome)) {
      return Promise.resolve(outcome);
    }
    shiftPending(entries, 1);
    return outcome.finally(() => {
      shiftPending(entries, -1);
    });
  };

  return { run, execute, validateEntries };
};
