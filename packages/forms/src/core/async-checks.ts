import { firstAsyncFailure, isAsyncRule } from '../rules/async-rule';
import type { FormIssue } from '../schema/standard';
import { cloneValue } from '../values/clone';
import { isEqualValue } from '../values/equal';
import type { FormCore } from './form-core';
import type { PendingTracker } from './pending';
import type { Entry } from './registry';
import { rulesFor } from './rules';

interface AsyncResult {
  readonly value: unknown;
  readonly message: string | undefined;
}

interface AsyncState {
  token: number;
  held: boolean;
  wake: (() => void) | undefined;
  controller: AbortController | undefined;
  result: AsyncResult | undefined;
}

export interface AsyncChecks {
  issues(active: readonly Entry[]): FormIssue[];
  schedule(entry: Entry, delay: number): void;
  settle(entries: readonly Entry[]): Promise<boolean>;
  cancel(entry: Entry): void;
  forget(entry: Entry): void;
  reset(): void;
}

export const createAsyncChecks = <V extends object, O>(
  core: FormCore<V, O>,
  pending: PendingTracker,
  revalidate: () => void,
): AsyncChecks => {
  const states = new Map<Entry, AsyncState>();

  const stateOf = (entry: Entry): AsyncState => {
    const known = states.get(entry);

    if (known) {
      return known;
    }

    const created: AsyncState = {
      token: 0,
      held: false,
      wake: undefined,
      controller: undefined,
      result: undefined,
    };

    states.set(entry, created);
    return created;
  };

  const formRules = (entry: Entry) => rulesFor(core.rules, entry.path()).filter(isAsyncRule);

  const freshResult = (entry: Entry): AsyncResult | undefined => {
    const result = states.get(entry)?.result;
    return result && isEqualValue(entry.value(), result.value) ? result : undefined;
  };

  const needsCheck = (entry: Entry): boolean =>
    !entry.disabled() &&
    (entry.checkAsync !== undefined || formRules(entry).length > 0) &&
    freshResult(entry) === undefined;

  const release = (entry: Entry, state: AsyncState): void => {
    if (state.held) {
      state.held = false;
      pending.release(entry);
    }
  };

  const cancel = (entry: Entry): void => {
    const state = states.get(entry);

    if (!state) {
      return;
    }
    state.token += 1;
    state.controller?.abort();
    state.controller = undefined;
    state.wake?.();
    state.wake = undefined;
    release(entry, state);
  };

  const start = (entry: Entry): readonly [AsyncState, number] => {
    cancel(entry);

    const state = stateOf(entry);

    state.token += 1;
    state.held = true;
    pending.hold(entry);
    return [state, state.token];
  };

  const run = async (entry: Entry, state: AsyncState, token: number): Promise<void> => {
    const controller = new AbortController();
    const value = cloneValue(entry.value());

    const context = {
      name: entry.path(),
      label: entry.label(),
      values: core.engine.snapshot(),
      messages: core.messages.value,
      signal: controller.signal,
    };

    state.controller = controller;

    try {
      const message =
        (await firstAsyncFailure(formRules(entry), value, context)) ??
        (await entry.checkAsync?.(context));

      if (token === state.token) {
        state.result = { value, message };
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
    }
  };

  const delayed = async (entry: Entry, state: AsyncState, token: number, delay: number) => {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, delay);

      state.wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });

    if (token !== state.token) {
      return;
    }
    await run(entry, state, token);

    if (token === state.token) {
      revalidate();
    }
  };

  const finish = (entry: Entry, state: AsyncState, token: number): void => {
    if (token === state.token) {
      state.controller = undefined;
      release(entry, state);
    }
  };

  return {
    issues: (active) =>
      active.flatMap((entry) => {
        const message = freshResult(entry)?.message;
        return message === undefined || entry.disabled() ? [] : [{ path: entry.path(), message }];
      }),
    schedule: (entry, delay) => {
      if (!needsCheck(entry)) {
        cancel(entry);
        return;
      }

      const [state, token] = start(entry);

      void core.tracker.track(
        delayed(entry, state, token, delay).finally(() => {
          finish(entry, state, token);
        }),
      );
    },
    settle: async (entries) => {
      const due = entries.filter(needsCheck);

      await Promise.all(
        due.map((entry) => {
          const [state, token] = start(entry);
          return run(entry, state, token).finally(() => {
            finish(entry, state, token);
          });
        }),
      );

      return due.length > 0;
    },
    cancel,
    forget: (entry) => {
      cancel(entry);
      states.delete(entry);
    },
    reset: () => {
      for (const [entry, state] of states) {
        cancel(entry);
        state.result = undefined;
      }
    },
  };
};
