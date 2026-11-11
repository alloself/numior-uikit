import { nextTick } from 'vue';
import { toOutcome, type FormIssue, type SchemaOutcome } from '../schema/standard';
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
import { firstFailure } from './rules';
import { ApplyScope, Trigger } from './core.types';

export interface RunResult<V, O> extends Classified {
  readonly baseline: V | undefined;
  readonly submitted: object;
  readonly output: O | undefined;
}

export interface Validation<V extends object, O> {
  readonly async: AsyncChecks<V>;
  run(checked?: readonly Entry<V>[]): MaybePromise<RunResult<V, O>>;
  execute(): MaybePromise<RunResult<V, O>>;
  validateEntries(
    entries: readonly Entry<V>[],
    trigger: Trigger,
    scope?: ApplyScope,
  ): Promise<RunResult<V, O>>;
  validateFully(entries: readonly Entry<V>[]): Promise<RunResult<V, O>>;
  inspect(entries: readonly Entry<V>[]): Promise<RunResult<V, O>>;
}

export const isClean = (result: Classified): boolean =>
  result.byOwner.size === 0 && result.formLevel.length === 0;

export const createValidation = <V extends object, O>(core: FormCore<V, O>): Validation<V, O> => {
  const pending = createPendingTracker();

  const asyncChecks = createAsyncChecks(core, pending, () => {
    void execute();
  });

  const ruleIssues = (values: V, active: readonly Entry<V>[]): FormIssue[] =>
    active.reduce<FormIssue[]>((found, entry) => {
      if (entry.inert()) {
        return found;
      }
      const path = entry.path();
      const rules = core.rulesAt(path).sync;

      const context = {
        name: path,
        label: entry.label(),
        values,
        messages: core.messages.value,
      };

      const message = firstFailure(rules, getAt(values, path), context) ?? entry.check(context);

      if (message !== undefined) {
        found.push({ path, message });
      }
      return found;
    }, []);

  const externalIssues = (): FormIssue[] =>
    [...core.external].flatMap(([path, error]) =>
      isEqualValue(getAt(core.engine.values, path), error.snapshot)
        ? error.messages.map((message) => ({ path, message }))
        : [],
    );

  const schemaOutcome = (submitted: object): MaybePromise<SchemaOutcome<O | undefined>> =>
    core.schema === undefined
      ? { ok: true, output: undefined }
      : chain(core.schema['~standard'].validate(submitted), toOutcome);

  const run = (checked?: readonly Entry<V>[], keep = false): MaybePromise<RunResult<V, O>> => {
    const snapshot = core.engine.snapshot();
    const index = core.registry.index();
    const targets = checked ?? index.active;
    const ruled = ruleIssues(snapshot, targets);
    const submitted: object = keep ? cloneValue(snapshot) : snapshot;

    prune(submitted, new Set([...core.registry.known, ...index.patterns]), index.covered);

    const extra = [...ruled, ...externalIssues(), ...asyncChecks.issues(targets)];

    return chain(schemaOutcome(submitted), (outcome) => {
      const issues = outcome.ok ? extra : [...outcome.issues, ...extra];

      return {
        ...classifyIssues(issues, core.registry.index()),
        baseline: keep ? snapshot : undefined,
        submitted,
        output: outcome.ok && issues.length === 0 ? outcome.output : undefined,
      };
    });
  };

  const dropStaleExternal = (): void => {
    for (const [path, error] of core.external) {
      if (isEqualValue(getAt(core.engine.values, path), error.snapshot)) {
        continue;
      }

      core.external.delete(path);
    }
  };

  const applyTo = (entries: readonly Entry<V>[], result: RunResult<V, O>): void => {
    for (const entry of entries) {
      if (!entry.state.attempted.value) {
        continue;
      }

      writeErrors(entry.state, result.byOwner.get(entry.path()) ?? []);
    }
  };

  const apply = (result: RunResult<V, O>): void => {
    applyTo(core.registry.active(), result);

    if (core.session.formAttempted) {
      core.schemaFormErrors.value = result.formLevel;
    }
    dropStaleExternal();
  };

  const execute = (own?: readonly Entry<V>[], keep = false): MaybePromise<RunResult<V, O>> => {
    const { epoch, shape } = core.session;

    core.session.started += 1;

    const order = core.session.started;

    const settle = (result: RunResult<V, O>): MaybePromise<RunResult<V, O>> => {
      if (epoch !== core.session.epoch) {
        return result;
      }
      if (shape !== core.session.shape) {
        return nextTick().then(() => execute(own, keep));
      }
      if (own) {
        applyTo(own, result);
      } else if (order > core.session.applied) {
        core.session.applied = order;
        apply(result);
      }
      return result;
    };

    const outcome = chain(run(own, keep), settle);

    return isPromise(outcome) ? core.tracker.track(outcome) : outcome;
  };

  const attempt = (
    entries: readonly Entry<V>[],
    scope: ApplyScope = 'attempted',
    keep = false,
  ): MaybePromise<RunResult<V, O>> => {
    for (const entry of entries) {
      entry.state.setAttempted(true);
    }

    const outcome = execute(scope === ApplyScope.Own ? entries : undefined, keep);

    if (!isPromise(outcome)) {
      return outcome;
    }
    for (const entry of entries) {
      pending.hold(entry);
    }
    return outcome.finally(() => {
      for (const entry of entries) {
        pending.release(entry);
      }
    });
  };

  const followAsync = (entries: readonly Entry<V>[], result: RunResult<V, O>, trigger: Trigger) => {
    for (const entry of entries) {
      if (result.byOwner.has(entry.path())) {
        asyncChecks.cancel(entry);
      } else {
        asyncChecks.schedule(entry, trigger === Trigger.Change ? entry.debounce() : 0);
      }
    }
    asyncChecks.refresh(entries);
    return result;
  };

  const passingAfter = (entries: readonly Entry<V>[], outcome: RunResult<V, O>): Entry<V>[] =>
    entries.reduce<Entry<V>[]>((passing, entry) => {
      if (outcome.byOwner.has(entry.path())) {
        asyncChecks.cancel(entry);
      } else {
        passing.push(entry);
      }
      return passing;
    }, []);

  const complete = async (
    entries: readonly Entry<V>[],
    first: MaybePromise<RunResult<V, O>>,
    again: () => MaybePromise<RunResult<V, O>>,
  ): Promise<RunResult<V, O>> => {
    let result = await first;

    while (await asyncChecks.settle(passingAfter(entries, result))) {
      result = await again();
    }
    return result;
  };

  return {
    async: asyncChecks,
    run,
    execute: () => execute(),
    validateEntries: (entries, trigger, scope) => {
      asyncChecks.retry(entries);

      const outcome = attempt(entries, scope);

      return isPromise(outcome)
        ? outcome.then((result) => followAsync(entries, result, trigger))
        : Promise.resolve(followAsync(entries, outcome, trigger));
    },
    validateFully: (entries) => {
      asyncChecks.retry(entries);

      return complete(entries, attempt(entries, 'attempted', true), () => execute(undefined, true));
    },
    inspect: (entries) => complete(entries, run(), () => run()),
  };
};
