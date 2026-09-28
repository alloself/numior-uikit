import { prefixesOf } from '../paths/paths';
import type { FormIssue } from '../schema/standard';
import type { FormMessage } from './form.types';
import type { AnyEntry, AnyIndex } from './registry';

export type IssueTarget =
  | { readonly kind: 'owner'; readonly entry: AnyEntry }
  | { readonly kind: 'form'; readonly path: string | undefined }
  | { readonly kind: 'ignored'; readonly path: string };

export interface Classified {
  readonly byOwner: ReadonlyMap<string, readonly string[]>;
  readonly formLevel: readonly FormMessage[];
  readonly ignored: readonly string[];
}

const ownerOf = (path: string, index: AnyIndex): AnyEntry | undefined => {
  for (const prefix of prefixesOf(path).toReversed()) {
    const owners = index.byPath.get(prefix);

    if (owners) {
      return owners.at(-1);
    }
  }
  return undefined;
};

export const targetOf = (path: string, index: AnyIndex): IssueTarget => {
  if (path === '') {
    return { kind: 'form', path: undefined };
  }

  const owner = ownerOf(path, index);

  if (owner) {
    return owner.inert() ? { kind: 'ignored', path } : { kind: 'owner', entry: owner };
  }
  return index.covered.has(path) ? { kind: 'form', path } : { kind: 'ignored', path };
};

export const classifyIssues = (issues: readonly FormIssue[], index: AnyIndex): Classified => {
  const byOwner = new Map<string, string[]>();
  const formLevel: FormMessage[] = [];
  const ignored: string[] = [];
  const seen = new Set<string>();

  const once = (scope: string, message: string): boolean => {
    const key = `${scope}\u0000${message}`;

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  };

  for (const issue of issues) {
    const target = targetOf(issue.path, index);

    switch (target.kind) {
      case 'owner': {
        const path = target.entry.path();

        if (once(`owner:${path}`, issue.message)) {
          byOwner.set(path, [...(byOwner.get(path) ?? []), issue.message]);
        }
        break;
      }
      case 'form':
        if (once(`form:${target.path ?? ''}`, issue.message)) {
          formLevel.push({ path: target.path, message: issue.message });
        }
        break;
      case 'ignored':
        ignored.push(target.path);
        break;
    }
  }
  return { byOwner, formLevel, ignored };
};
