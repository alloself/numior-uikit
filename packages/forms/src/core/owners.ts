import { isUnder } from '../paths/paths';
import type { FormIssue } from '../schema/standard';
import type { Entry } from './registry';
import type { FormMessage } from './types';

export type IssueTarget =
  | { readonly kind: 'owner'; readonly entry: Entry }
  | { readonly kind: 'form'; readonly path: string | undefined }
  | { readonly kind: 'ignored'; readonly path: string };

export interface Classified {
  readonly byOwner: ReadonlyMap<string, readonly string[]>;
  readonly formLevel: readonly FormMessage[];
  readonly ignored: readonly string[];
}

const deeper = (best: Entry | undefined, entry: Entry): Entry =>
  best === undefined || entry.path().length >= best.path().length ? entry : best;

const ownerOf = (path: string, owners: readonly Entry[]): Entry | undefined =>
  owners.reduce<Entry | undefined>(
    (best, entry) => (isUnder(path, entry.path()) ? deeper(best, entry) : best),
    undefined,
  );

export const targetOf = (path: string, owners: readonly Entry[]): IssueTarget => {
  if (path === '') {
    return { kind: 'form', path: undefined };
  }

  const owner = ownerOf(path, owners);

  if (owner) {
    return owner.disabled() ? { kind: 'ignored', path } : { kind: 'owner', entry: owner };
  }
  return owners.some((entry) => isUnder(entry.path(), path))
    ? { kind: 'form', path }
    : { kind: 'ignored', path };
};

const addMessage = (messages: Map<string, string[]>, path: string, message: string): void => {
  const list = messages.get(path) ?? [];

  if (!list.includes(message)) {
    messages.set(path, [...list, message]);
  }
};

const sameMessage = (left: FormMessage, right: FormMessage): boolean =>
  left.path === right.path && left.message === right.message;

const withFormMessage = (
  messages: readonly FormMessage[],
  message: FormMessage,
): readonly FormMessage[] =>
  messages.some((item) => sameMessage(item, message)) ? messages : [...messages, message];

export const classifyIssues = (
  issues: readonly FormIssue[],
  owners: readonly Entry[],
): Classified => {
  const byOwner = new Map<string, string[]>();
  const ignored: string[] = [];
  let formLevel: readonly FormMessage[] = [];

  for (const issue of issues) {
    const target = targetOf(issue.path, owners);

    if (target.kind === 'owner') {
      addMessage(byOwner, target.entry.path(), issue.message);
    } else if (target.kind === 'form') {
      formLevel = withFormMessage(formLevel, { path: target.path, message: issue.message });
    } else {
      ignored.push(target.path);
    }
  }
  return { byOwner, formLevel, ignored };
};
