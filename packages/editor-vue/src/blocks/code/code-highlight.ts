import {
  blockDecoration,
  createMetaKey,
  decorationSet,
  definePlugin,
  type DecorationSet,
  type EditorState,
  type ElementNode,
  type Mappable,
  type NodeId,
  type Plugin,
  type Transaction,
} from '@numior/editor-core';
import { highlightCode, type NuiCodeTokens, type NuiHighlighter } from '@numior/primitives';
import { codeTextOf } from './code-text';

const CODE_TYPE = 'code_block';
const SCOPE_CLASS = 'nui-content__token--scope-';

interface CodeRange {
  readonly from: number;
  readonly to: number;
  readonly class: string;
}

interface CodePaint {
  readonly text: string;
  readonly ranges: readonly CodeRange[];
}

type CodePaints = ReadonlyMap<NodeId, CodePaint>;

interface CodeAnswer {
  readonly id: NodeId;
  readonly text: string;
  readonly tokens: NuiCodeTokens;
}

interface CodeBlock {
  readonly id: NodeId;
  readonly text: string;
  readonly language: string | undefined;
}

const answerKey = createMetaKey<readonly CodeAnswer[]>('code-answers');

const SLICE_MS = 8;

const languageOf = (node: ElementNode): string | undefined =>
  typeof node.attrs.language === 'string' ? node.attrs.language : undefined;

const rangesOf = (tokens: NuiCodeTokens): CodeRange[] => {
  const found: CodeRange[] = [];
  let offset = 0;

  for (const [index, line] of (tokens ?? []).entries()) {
    offset += index === 0 ? 0 : 1;
    for (const token of line) {
      if (token.scope !== undefined) {
        found.push({
          from: offset,
          to: offset + token.text.length,
          class: SCOPE_CLASS + token.scope,
        });
      }
      offset += token.text.length;
    }
  }
  return found;
};

interface Shift {
  readonly mapping: Mappable;
  readonly before: number;
  readonly after: number;
  readonly size: number;
}

const shifted = (range: CodeRange, shift: Shift): CodeRange => ({
  from: shift.mapping.map(range.from + shift.before, 1) - shift.after,
  to: shift.mapping.map(range.to + shift.before, -1) - shift.after,
  class: range.class,
});

const follow = (paint: CodePaint, shift: Shift, text: string): CodePaint => ({
  text,
  ranges: paint.ranges
    .map((range) => shifted(range, shift))
    .filter((range) => range.from >= 0 && range.to > range.from && range.to <= shift.size),
});

const answered = (paints: CodePaints, state: EditorState, answer: CodeAnswer): CodePaints => {
  const node = state.doc.byId(answer.id);

  return node === undefined || codeTextOf(node) !== answer.text
    ? paints
    : new Map(paints).set(answer.id, { text: answer.text, ranges: rangesOf(answer.tokens) });
};

const followed = (paints: CodePaints, tr: Transaction, before: EditorState): CodePaints => {
  let next: Map<NodeId, CodePaint> | undefined;

  for (const [id, paint] of paints) {
    const old = before.doc.byId(id);
    const node = tr.doc.byId(id);

    if (node === undefined) {
      next ??= new Map(paints);
      next.delete(id);
    } else if (node !== old) {
      const text = codeTextOf(node);

      if (text !== paint.text) {
        const shift = {
          mapping: tr.mapping,
          before: (before.doc.positionOf(id) ?? 0) + 1,
          after: (tr.doc.positionOf(id) ?? 0) + 1,
          size: text.length,
        };

        next ??= new Map(paints);
        next.set(id, follow(paint, shift, text));
      }
    }
  }
  return next ?? paints;
};

const setsByPaints = new WeakMap<CodePaints, DecorationSet>();

const setOf = (paints: CodePaints): DecorationSet => {
  const known = setsByPaints.get(paints);

  if (known !== undefined) {
    return known;
  }

  const set = decorationSet(
    [],
    [...paints].flatMap(([id, paint]) =>
      paint.ranges.map((range) => blockDecoration(id, range.from, range.to, range.class)),
    ),
  );

  setsByPaints.set(paints, set);
  return set;
};

export const codeHighlightPlugin = (): Plugin<CodePaints> => {
  const plugin: Plugin<CodePaints> = definePlugin<CodePaints>({
    name: 'code-highlight',
    state: {
      init: () => new Map(),
      apply: (tr, value, before, after) => {
        const answers = tr.getMeta(answerKey) ?? [];
        const moved = tr.changed ? followed(value, tr, before) : value;

        return answers.reduce((paints, answer) => answered(paints, after, answer), moved);
      },
    },
    props: {
      decorations: (state): DecorationSet | undefined => {
        const paints = plugin.getState(state);

        return paints === undefined ? undefined : setOf(paints);
      },
    },
  });

  return plugin;
};

const elementsOf = (node: ElementNode | undefined): ReadonlyMap<NodeId, ElementNode> =>
  new Map(
    (node?.content ?? []).flatMap((child) => (child.kind === 'element' ? [[child.id, child]] : [])),
  );

const changedCode = (
  before: ElementNode | undefined,
  after: ElementNode,
  found: CodeBlock[],
): void => {
  if (before === after) {
    return;
  }
  if (after.type === CODE_TYPE) {
    found.push({ id: after.id, text: codeTextOf(after), language: languageOf(after) });
    return;
  }

  let previous: ReadonlyMap<NodeId, ElementNode> | undefined;

  for (const [index, child] of after.content.entries()) {
    if (child.kind === 'element') {
      const aligned = before?.content[index];

      if (aligned === child) {
        continue;
      }
      previous ??= elementsOf(before);
      changedCode(previous.get(child.id), child, found);
    }
  }
};

const keyOf = (block: CodeBlock): string => `${block.language ?? ''}\n${block.text}`;

export interface CodeHighlighter {
  update(state: EditorState): void;
}

interface Seen {
  readonly root: ElementNode;
  readonly highlighter: NuiHighlighter;
}

const nextTask = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export const createCodeHighlighter = (
  highlighter: () => NuiHighlighter | null,
  dispatch: (tr: Transaction) => void,
  state: () => EditorState,
): CodeHighlighter => {
  const asked = new Map<NodeId, string>();
  const queue = new Map<NodeId, CodeBlock>();
  let seen: Seen | undefined;
  let running = false;

  const current = (block: CodeBlock): boolean => asked.get(block.id) === keyOf(block);

  const send = (answers: readonly CodeAnswer[]): void => {
    if (answers.length > 0) {
      dispatch(state().tr.setMeta(answerKey, answers));
    }
  };

  const drain = async (active: NuiHighlighter): Promise<void> => {
    let answers: CodeAnswer[] = [];
    let started = performance.now();

    for (const [id, block] of queue) {
      queue.delete(id);
      if (current(block)) {
        const tokens = await highlightCode(active, block.text, block.language);

        if (current(block)) {
          answers.push({ id, text: block.text, tokens });
        }
      }
      if (performance.now() - started > SLICE_MS) {
        send(answers);
        answers = [];
        await nextTask();
        started = performance.now();
      }
    }
    send(answers);
  };

  const work = async (active: NuiHighlighter): Promise<void> => {
    running = true;
    try {
      await drain(active);
    } finally {
      running = false;
    }
  };

  return {
    update: (next) => {
      const active = highlighter();

      if (active === null) {
        return;
      }

      const found: CodeBlock[] = [];

      changedCode(seen?.highlighter === active ? seen.root : undefined, next.doc.root, found);
      seen = { root: next.doc.root, highlighter: active };
      for (const block of found) {
        if (!current(block)) {
          asked.set(block.id, keyOf(block));
          queue.set(block.id, block);
        }
      }
      if (!running && queue.size > 0) {
        void work(active);
      }
    },
  };
};
