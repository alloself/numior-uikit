import type { ReferenceBlock } from './reference.types.ts';

interface BlockDraft {
  readonly parts: Set<string>;
  readonly modifiers: Set<string>;
}

const CLASS_RE =
  /\.nui-([a-z0-9]+(?:-[a-z0-9]+)*?)(__[a-z0-9]+(?:-[a-z0-9]+)*)?(--[a-z0-9]+(?:-[a-z0-9]+)*)?(?![a-z0-9_-])/g;

const TOKEN_RE = /var\(--nui-([a-z0-9-]+)/g;

const draftOf = (drafts: Map<string, BlockDraft>, name: string): BlockDraft => {
  const existing = drafts.get(name);

  if (existing !== undefined) {
    return existing;
  }
  const draft: BlockDraft = { parts: new Set(), modifiers: new Set() };

  drafts.set(name, draft);
  return draft;
};

export const parseBlocks = (css: string): ReferenceBlock[] => {
  const drafts = new Map<string, BlockDraft>();

  for (const match of css.matchAll(CLASS_RE)) {
    const [, block, part, modifier] = match;

    if (block === undefined) {
      continue;
    }
    const draft = draftOf(drafts, block);

    if (part !== undefined) {
      draft.parts.add(part.slice(2));
    }
    if (modifier === undefined) {
      continue;
    }

    draft.modifiers.add(`${part === undefined ? '' : part}${modifier}`.replace(/^--/, ''));
  }
  return [...drafts.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, draft]) => ({
      name: `nui-${name}`,
      parts: [...draft.parts].toSorted(),
      modifiers: [...draft.modifiers].toSorted(),
    }));
};

export const parseTokens = (css: string): string[] =>
  [...new Set([...css.matchAll(TOKEN_RE)].map((match) => `--nui-${match[1] ?? ''}`))].toSorted();
