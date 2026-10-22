import { firstAsyncFailure } from '../rules/async-rule';
import type { FormIssue } from '../schema/standard';
import { cloneValue } from '../values/clone';
import { isEqualValue } from '../values/equal';
import { readsHold, recordReads } from '../values/reads';
import type { FormCore } from './form-core';
import type { PendingTracker } from './pending';
import type { Entry } from './registry';
import { validatesOnChange } from './timing';

interface AsyncResult {
  readonly value: unknown;
  readonly reads: ReadonlyMap<string, unknown>;
  readonly message: string | undefined;
}

type AsyncPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'debouncing'; readonly wake: () => void }
  | { readonly kind: 'running'; readonly controller: AbortController };

interface AsyncState {
  token: number;
  phase: AsyncPhase;
  result: AsyncResult | undefined;
}

export interface AsyncChecks<V extends object> {
  issues(active: readonly Entry<V>[]): FormIssue[];
  schedule(entry: Entry<V>, delay: number): void;
  settle(entries: readonly Entry<V>[]): Promise<boolean>;
  refresh(changed: readonly Entry<V>[]): void;
  cancel(entry: Entry<V>): void;
  forget(entry: Entry<V>): void;
  reset(): void;
}

const IDLE: AsyncPhase = { kind: 'idle' };

export const createAsyncChecks = <V extends object, O>(
  core: FormCore<V, O>,
  pending: PendingTracker,
  revalidate: () => void,
): AsyncChecks<V> => {
  const states = new Map<Entry<V>, AsyncState>();

  const stateOf = (entry: Entry<V>): AsyncState => {
    const known = states.get(entry);

    if (known) {
      return known;
    }

    const created: AsyncState = { token: 0, phase: IDLE, result: undefined };

    states.set(entry, created);
    return created;
  };

  const formRules = (entry: Entry<V>) => core.rulesAt(entry.path()).async;

  const freshResult = (entry: Entry<V>): AsyncResult | undefined => {
    const result = states.get(entry)?.result;

    return result &&
      isEqualValue(entry.value(), result.value) &&
      readsHold(result.reads, core.engine.raw)
      ? result
      : undefined;
  };

  const needsCheck = (entry: Entry<V>): boolean =>
    !entry.inert() &&
    (entry.hasAsync() || formRules(entry).length > 0) &&
    freshResult(entry) === undefined;

  const settleAt = (entry: Entry<V>, state: AsyncState, phase: AsyncPhase): void => {
    const held = state.phase.kind !== 'idle';

    state.phase = phase;

    if (held && phase.kind === 'idle') {
      pending.release(entry);
    } else if (!held && phase.kind !== 'idle') {
      pending.hold(entry);
    }
  };

  const cancel = (entry: Entry<V>): void => {
    const state = states.get(entry);

    if (!state) {
      return;
    }

    const { phase } = state;

    state.token += 1;

    switch (phase.kind) {
      case 'debouncing':
        phase.wake();
        break;
      case 'running':
        phase.controller.abort();
        break;
      case 'idle':
        break;
    }
    settleAt(entry, state, IDLE);
  };

  const start = (entry: Entry<V>): readonly [AsyncState, number] => {
    cancel(entry);

    const state = stateOf(entry);

    state.token += 1;
    return [state, state.token];
  };

  const run = async (
    entry: Entry<V>,
    state: AsyncState,
    token: number,
    values: V,
  ): Promise<void> => {
    const controller = new AbortController();
    const value = cloneValue(entry.value());
    const log = recordReads(values);

    const context = {
      name: entry.path(),
      label: entry.label(),
      values: log.view,
      messages: core.messages.value,
      signal: controller.signal,
    };

    settleAt(entry, state, { kind: 'running', controller });

    try {
      const message =
        (await firstAsyncFailure(formRules(entry), value, context)) ??
        (await entry.checkAsync(context));

      if (token === state.token) {
        state.result = { value, reads: log.reads(), message };
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
    }
  };

  const delayed = async (entry: Entry<V>, state: AsyncState, token: number, delay: number) => {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, delay);

      settleAt(entry, state, {
        kind: 'debouncing',
        wake: () => {
          clearTimeout(timer);
          resolve();
        },
      });
    });

    if (token !== state.token) {
      return;
    }
    await run(entry, state, token, core.engine.snapshot());

    if (token === state.token) {
      revalidate();
    }
  };

  const finish = (entry: Entry<V>, state: AsyncState, token: number): void => {
    if (token === state.token) {
      settleAt(entry, state, IDLE);
    }
  };

  const schedule = (entry: Entry<V>, delay: number): void => {
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
  };

  const outdated = (entry: Entry<V>, state: AsyncState): boolean =>
    state.result !== undefined &&
    state.phase.kind === 'idle' &&
    entry.active() &&
    validatesOnChange(entry.validateOn(), entry.state.attempted.value) &&
    freshResult(entry) === undefined;

  return {
    issues: (active) =>
      active.flatMap((entry) => {
        const message = freshResult(entry)?.message;
        return message === undefined || entry.inert() ? [] : [{ path: entry.path(), message }];
      }),
    schedule,
    refresh: (changed) => {
      for (const [entry, state] of states) {
        if (!changed.includes(entry) && outdated(entry, state)) {
          schedule(entry, entry.debounce());
        }
      }
    },
    settle: async (entries) => {
      const due = entries.filter(needsCheck);

      if (due.length === 0) {
        return false;
      }

      const values = core.engine.snapshot();

      await Promise.all(
        due.map((entry) => {
          const [state, token] = start(entry);
          return run(entry, state, token, values).finally(() => {
            finish(entry, state, token);
          });
        }),
      );

      return true;
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
