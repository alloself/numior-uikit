import { toOutcome, type FormIssue, type SchemaOutcome } from '../schema/standard';
import { isSyncRule } from '../rules/async-rule';
import { getAt } from '../values/access';
import { cloneValue } from '../values/clone';
import { isEqualValue } from '../values/equal';
import { createAsyncChecks, type AsyncChecks } from './async-checks';
import type { FormCore } from './form-core';
import { chain, isPromise, type MaybePromise } from './maybe';
import { writeErrors } from './messages';
import { classifyIssues, type Classified } from './owners';
import { createPendingTracker } from './pending';
import { prune } from './prune';
import type { Entry } from './registry';
import { firstFailure, rulesFor } from './rules';

export type Trigger = 'change' | 'blur';

export type ApplyScope = 'attempted' | 'own';

export interface RunResult<V, O> extends Classified {
  readonly input: V;
  readonly submitted: V;
  readonly output: O | undefined;
}

export interface Validation<V extends object, O> {
  readonly async: AsyncChecks;
  run(): MaybePromise<RunResult<V, O>>;
  execute(): MaybePromise<RunResult<V, O>>;
  validateEntries(
    entries: readonly Entry[],
    trigger: Trigger,
    scope?: ApplyScope,
  ): Promise<RunResult<V, O>>;
  validateFully(entries: readonly Entry[]): Promise<RunResult<V, O>>;
}

export const isClean = (result: Classified): boolean =>
  result.byOwner.size === 0 && result.formLevel.length === 0;

export const createValidation = <V extends object, O>(core: FormCore<V, O>): Validation<V, O> => {
  const pending = createPendingTracker();

  const asyncChecks = createAsyncChecks(core, pending, () => {
    void execute();
  });

  const ruleIssues = (submitted: V, active: readonly Entry[]): FormIssue[] =>
    active
      .filter((entry) => !entry.disabled())
      .flatMap((entry) => {
        const path = entry.path();
        const rules = rulesFor(core.rules, path).filter(isSyncRule);

        const context = {
          name: path,
          label: entry.label(),
          values: submitted,
          messages: core.messages.value,
        };

        const message =
          firstFailure(rules, getAt(submitted, path), context) ?? entry.check(context);

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

    const extra = [
      ...ruleIssues(submitted, active),
      ...externalIssues(),
      ...asyncChecks.issues(active),
    ];

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

  const applyTo = (entries: readonly Entry[], result: RunResult<V, O>): void => {
    for (const entry of entries) {
      if (entry.state.attempted.value) {
        writeErrors(entry.state, result.byOwner.get(entry.path()) ?? []);
      }
    }
  };

  const apply = (result: RunResult<V, O>): void => {
    applyTo(core.registry.active(), result);

    if (core.session.formAttempted) {
      core.schemaFormErrors.value = result.formLevel;
    }
    dropStaleExternal();
  };

  const execute = (own?: readonly Entry[]): MaybePromise<RunResult<V, O>> => {
    const epoch = core.session.epoch;

    core.session.started += 1;

    const order = core.session.started;

    const settle = (result: RunResult<V, O>): RunResult<V, O> => {
      if (epoch !== core.session.epoch) {
        return result;
      }
      if (own) {
        applyTo(own, result);
      } else if (order > core.session.applied) {
        core.session.applied = order;
        apply(result);
      }
      return result;
    };

    const outcome = chain(run(), settle);

    return isPromise(outcome) ? core.tracker.track(outcome) : outcome;
  };

  const attempt = (
    entries: readonly Entry[],
    scope: ApplyScope = 'attempted',
  ): MaybePromise<RunResult<V, O>> => {
    for (const entry of entries) {
      entry.state.setAttempted(true);
    }

    const outcome = execute(scope === 'own' ? entries : undefined);

    if (!isPromise(outcome)) {
      return outcome;
    }
    entries.forEach(pending.hold);
    return outcome.finally(() => {
      entries.forEach(pending.release);
    });
  };

  const followAsync = (entries: readonly Entry[], result: RunResult<V, O>, trigger: Trigger) => {
    for (const entry of entries) {
      if (result.byOwner.has(entry.path())) {
        asyncChecks.cancel(entry);
      } else {
        asyncChecks.schedule(entry, trigger === 'change' ? entry.debounce : 0);
      }
    }
    return result;
  };

  return {
    async: asyncChecks,
    run,
    execute: () => execute(),
    validateEntries: (entries, trigger, scope) => {
      const outcome = attempt(entries, scope);

      return isPromise(outcome)
        ? outcome.then((result) => followAsync(entries, result, trigger))
        : Promise.resolve(followAsync(entries, outcome, trigger));
    },
    validateFully: async (entries) => {
      const first = await attempt(entries);
      const failing = entries.filter((entry) => first.byOwner.has(entry.path()));

      failing.forEach(asyncChecks.cancel);

      const checked = await asyncChecks.settle(entries.filter((entry) => !failing.includes(entry)));

      return checked ? execute() : first;
    },
  };
};
