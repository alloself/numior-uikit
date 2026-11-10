import {
  blockDecoration,
  ContentNodeKind,
  createMetaKey,
  decorationSet,
  definePlugin,
  type DecorationSet,
  type EditorState,
  type ElementNode,
  type Mappable,
  type NodeId,
  type Plugin,
  type Schema,
  type Transaction,
} from '@numior/editor-core';
import { promiseTimeout } from '@vueuse/core';
import { highlightCode, type NuiCodeTokens, type NuiHighlighter } from '@numior/primitives';
import { codeTextOf } from './code-text';

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

interface CodePlace {
  readonly node: ElementNode;
  readonly pos: number;
}

interface CodeState {
  readonly paints: CodePaints;
  readonly places: ReadonlyMap<NodeId, CodePlace>;
}

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

interface Shift {
  readonly mapping: Mappable;
  readonly before: number;
  readonly after: number;
  readonly size: number;
}

export interface CodeHighlighter {
  update(state: EditorState): void;
  reset(): void;
  stop(): void;
}

interface Seen {
  readonly root: ElementNode;
  readonly highlighter: NuiHighlighter;
}

const CODE_TYPE = 'code_block';
const SCOPE_CLASS = 'nui-content__token--scope-';

const NO_CODE: CodeState = { paints: new Map(), places: new Map() };

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

const answered = (value: CodeState, state: EditorState, answer: CodeAnswer): CodeState => {
  const node = state.doc.byId(answer.id);
  const pos = state.doc.positionOf(answer.id);

  return node === undefined || pos === undefined || codeTextOf(node) !== answer.text
    ? value
    : {
        paints: new Map(value.paints).set(answer.id, {
          text: answer.text,
          ranges: rangesOf(answer.tokens),
        }),
        places: new Map(value.places).set(answer.id, { node, pos }),
      };
};

const placeAfter = (id: NodeId, place: CodePlace, tr: Transaction): CodePlace | undefined => {
  const pos = tr.mapping.map(place.pos, 1);
  const node = tr.doc.nodeAt(pos);

  if (node?.kind === ContentNodeKind.Element && node.id === id) {
    return { node, pos };
  }

  const found = tr.doc.byId(id);
  const at = tr.doc.positionOf(id);

  return found === undefined || at === undefined ? undefined : { node: found, pos: at };
};

const followed = (value: CodeState, tr: Transaction): CodeState => {
  let paints: Map<NodeId, CodePaint> | undefined;
  let places: Map<NodeId, CodePlace> | undefined;

  for (const [id, place] of value.places) {
    const next = placeAfter(id, place, tr);
    const paint = value.paints.get(id);

    if (next === undefined || paint === undefined) {
      paints ??= new Map(value.paints);
      places ??= new Map(value.places);
      paints.delete(id);
      places.delete(id);
    } else if (next.node !== place.node || next.pos !== place.pos) {
      const text = codeTextOf(next.node);

      places ??= new Map(value.places);
      places.set(id, next);
      if (text !== paint.text) {
        const shift = {
          mapping: tr.mapping,
          before: place.pos + 1,
          after: next.pos + 1,
          size: text.length,
        };

        paints ??= new Map(value.paints);
        paints.set(id, follow(paint, shift, text));
      }
    }
  }
  return places === undefined ? value : { paints: paints ?? value.paints, places };
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

export const codeHighlightPlugin = (): Plugin<CodeState> => {
  const plugin: Plugin<CodeState> = definePlugin<CodeState>({
    name: 'code-highlight',
    state: {
      init: () => NO_CODE,
      apply: (tr, value, _before, after) => {
        const answers = tr.getMeta(answerKey) ?? [];
        const moved = tr.changed ? followed(value, tr) : value;

        return answers.reduce((current, answer) => answered(current, after, answer), moved);
      },
    },
    props: {
      decorations: (state): DecorationSet | undefined => {
        const value = plugin.getState(state);

        return value === undefined ? undefined : setOf(value.paints);
      },
    },
  });

  return plugin;
};

const elementsOf = (node: ElementNode | undefined): ReadonlyMap<NodeId, ElementNode> =>
  new Map(
    (node?.content ?? []).flatMap((child) =>
      child.kind === ContentNodeKind.Element ? [[child.id, child]] : [],
    ),
  );

const inlineOnly = (schema: Schema, node: ElementNode): boolean =>
  node.type !== CODE_TYPE && schema.nodes.get(node.type)?.inlineContent === true;

const changedCode = (
  schema: Schema,
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
    if (child.kind === ContentNodeKind.Element) {
      const aligned = before?.content[index];

      if (aligned === child || inlineOnly(schema, child)) {
        continue;
      }
      previous ??= elementsOf(before);
      changedCode(schema, previous.get(child.id), child, found);
    }
  }
};

const keyOf = (block: CodeBlock): string => `${block.language ?? ''}\n${block.text}`;

const nextTask = (): Promise<void> => promiseTimeout(0);

export const createCodeHighlighter = (
  highlighter: () => NuiHighlighter | null,
  dispatch: (tr: Transaction) => void,
  state: () => EditorState,
): CodeHighlighter => {
  const asked = new Map<NodeId, string>();
  const queue = new Map<NodeId, CodeBlock>();
  let seen: Seen | undefined;
  let running = false;
  let stopped = false;

  const current = (block: CodeBlock): boolean => asked.get(block.id) === keyOf(block);

  const send = (answers: readonly CodeAnswer[]): void => {
    if (answers.length > 0) {
      dispatch(state().tr.setMeta(answerKey, answers));
    }
  };

  const ask = async (active: NuiHighlighter, block: CodeBlock): Promise<CodeAnswer | undefined> => {
    try {
      const tokens = await highlightCode(active, block.text, block.language);

      return current(block) ? { id: block.id, text: block.text, tokens } : undefined;
    } catch {
      asked.delete(block.id);
      return undefined;
    }
  };

  const prune = (): void => {
    const { doc } = state();

    for (const id of asked.keys()) {
      if (doc.byId(id) === undefined) {
        asked.delete(id);
      }
    }
  };

  const drain = async (active: NuiHighlighter): Promise<void> => {
    let answers: CodeAnswer[] = [];
    let started = performance.now();

    for (const [id, block] of queue) {
      queue.delete(id);

      const answer = stopped || !current(block) ? undefined : await ask(active, block);

      if (answer !== undefined && !stopped) {
        answers.push(answer);
      }
      if (performance.now() - started > SLICE_MS) {
        send(answers);
        answers = [];
        await nextTask();
        started = performance.now();
      }
    }
    if (stopped) {
      return;
    }

    send(answers);
    prune();
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

      if (seen !== undefined && seen.highlighter !== active) {
        asked.clear();
      }

      changedCode(
        next.doc.schema,
        seen?.highlighter === active ? seen.root : undefined,
        next.doc.root,
        found,
      );

      seen = { root: next.doc.root, highlighter: active };
      for (const block of found) {
        if (!current(block)) {
          asked.set(block.id, keyOf(block));
          queue.set(block.id, block);
        }
      }
      if (!running && queue.size > 0 && !stopped) {
        void work(active);
      }
    },
    reset: () => {
      asked.clear();
      queue.clear();
      seen = undefined;
    },
    stop: () => {
      stopped = true;
      queue.clear();
    },
  };
};
