import { normalizePath } from '../paths/paths';
import { getAt } from '../values/access';
import { cloneValue } from '../values/clone';
import type { FormCore } from './form-core';
import { unique, writeErrors } from './messages';
import { targetOf } from './owners';
import type { AnyEntry } from './registry';
import { IssueTargetKind } from './core.types';

export interface ErrorControls {
  setFieldError(path: string, messages: readonly string[]): void;
  setFormErrors(messages: readonly string[]): void;
  clearServerErrors(): void;
  hasServerErrors(): boolean;
}

export const createErrorControls = <V extends object, O>(core: FormCore<V, O>): ErrorControls => {
  const setOwnerError = (entry: AnyEntry, messages: readonly string[]): void => {
    const path = entry.path();
    const previous = core.external.get(path)?.messages ?? [];
    const kept = entry.state.errors.value.filter((message) => !previous.includes(message));

    if (messages.length === 0) {
      core.external.delete(path);
      writeErrors(entry.state, kept);
      return;
    }
    core.external.set(path, { messages, snapshot: cloneValue(getAt(core.engine.values, path)) });
    entry.state.setAttempted(true);
    writeErrors(entry.state, unique([...kept, ...messages]));
  };

  const setFormPathError = (path: string | undefined, messages: readonly string[]): void => {
    const others = core.serverFormErrors.value.filter((message) => message.path !== path);

    core.serverFormErrors.value = [
      ...others,
      ...unique(messages).map((message) => ({ path, message })),
    ];
  };

  return {
    setFieldError: (rawPath, messages) => {
      const target = targetOf(normalizePath(rawPath), core.registry.index());

      if (target.kind === IssueTargetKind.Owner) {
        setOwnerError(target.entry, messages);
      } else {
        setFormPathError(target.path, messages);
      }
    },
    setFormErrors: (messages) => {
      setFormPathError(undefined, messages);
    },
    clearServerErrors: () => {
      core.external.clear();
      core.serverFormErrors.value = [];
    },
    hasServerErrors: () => core.external.size > 0 || core.serverFormErrors.value.length > 0,
  };
};
