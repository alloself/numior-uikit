import { prefixesOf } from '../paths/paths';
import type { FormIssue } from '../schema/standard';
import type { FormMessage } from './form.types';
import type { AnyEntry, AnyIndex } from './registry';
import { IssueTargetKind } from './core.types';

export type IssueTarget =
  | { readonly kind: typeof IssueTargetKind.Owner; readonly entry: AnyEntry }
  | { readonly kind: typeof IssueTargetKind.Form; readonly path: string | undefined }
  | { readonly kind: typeof IssueTargetKind.Ignored; readonly path: string };

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
    return { kind: IssueTargetKind.Form, path: undefined };
  }

  const owner = ownerOf(path, index);

  if (owner) {
    return owner.inert()
      ? { kind: IssueTargetKind.Ignored, path }
      : { kind: IssueTargetKind.Owner, entry: owner };
  }
  return index.covered.has(path)
    ? { kind: IssueTargetKind.Form, path }
    : { kind: IssueTargetKind.Ignored, path };
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
      case IssueTargetKind.Owner: {
        const path = target.entry.path();

        if (once(`owner:${path}`, issue.message)) {
          byOwner.set(path, [...(byOwner.get(path) ?? []), issue.message]);
        }
        break;
      }
      case IssueTargetKind.Form:
        if (once(`form:${target.path ?? ''}`, issue.message)) {
          formLevel.push({ path: target.path, message: issue.message });
        }
        break;
      case IssueTargetKind.Ignored:
        ignored.push(target.path);
        break;
    }
  }
  return { byOwner, formLevel, ignored };
};
