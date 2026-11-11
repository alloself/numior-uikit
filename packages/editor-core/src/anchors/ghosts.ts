import { HistoryAction } from '../history/history.types';
import type { Transaction } from '../state/state.types';
import { StepMapKind, type Mappable, type StepMap } from '../transform/mapping.types';

interface Hold {
  readonly id: string;
  readonly from: number;
  readonly to: number;
}

export interface Ghost {
  readonly pos: number;
  readonly cut: number;
  readonly size: number;
  readonly text: string;
  readonly by: HistoryAction;
  readonly holds: readonly Hold[];
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

export interface Trace {
  readonly spans: ReadonlyMap<string, Span>;
  readonly ghosts: readonly Ghost[];
  readonly revived: ReadonlySet<string>;
}

type Stage =
  | { readonly kind: typeof StageKind.Move; readonly map: StepMap }
  | {
      readonly kind: typeof StageKind.Change;
      readonly start: number;
      readonly oldSize: number;
      readonly newSize: number;
      readonly cut: number;
      readonly travel: HistoryAction | undefined;
      readonly removed: (from: number, to: number) => string;
      readonly inserted: () => string;
    };

type Change = Extract<Stage, { readonly kind: typeof StageKind.Change }>;

interface Return {
  readonly oldest: number;
  readonly newest: number;
}

const StageKind = { Move: 'move', Change: 'change' } as const;

const LIMIT = 256;

const NO_HOLDS: readonly Hold[] = [];

const pruned = (ghosts: readonly Ghost[]): readonly Ghost[] => {
  if (ghosts.length <= LIMIT) {
    return ghosts;
  }

  const dropped = new Set(
    ghosts
      .toSorted(
        (left, right) =>
          Math.sign(left.holds.length) - Math.sign(right.holds.length) || left.cut - right.cut,
      )
      .slice(0, ghosts.length - LIMIT),
  );

  return ghosts.filter((ghost) => !dropped.has(ghost));
};

const shrunk = (pos: number, start: number, end: number): number => {
  if (pos <= start) {
    return pos;
  }
  return pos >= end ? pos - (end - start) : start;
};

const heldIn = (touched: readonly Hold[], from: number, to: number): readonly Hold[] =>
  touched.reduce<Hold[]>((holds, hold) => {
    const head = Math.max(hold.from, from);
    const tail = Math.min(hold.to, to);

    if (head < tail) {
      holds.push({ id: hold.id, from: head - from, to: tail - from });
    }
    return holds;
  }, []);

const cutOut = (trace: Trace, change: Change): Trace => {
  const start = change.start;
  const end = start + change.oldSize;
  const spans = new Map<string, Span>();
  const touched: Hold[] = [];
  const ghosts: Ghost[] = [];
  let at = start;

  for (const [id, span] of trace.spans) {
    if (Math.max(start, span.from) < Math.min(end, span.to)) {
      touched.push({ id, ...span });
    }

    spans.set(id, { from: shrunk(span.from, start, end), to: shrunk(span.to, start, end) });
  }

  const piece = (until: number): void => {
    if (until > at) {
      ghosts.push({
        pos: start,
        cut: change.cut,
        size: until - at,
        text: change.removed(at, until),
        by: change.travel === HistoryAction.Undo ? HistoryAction.Redo : HistoryAction.Undo,
        holds: touched.length === 0 ? NO_HOLDS : heldIn(touched, at, until),
      });
    }

    at = until;
  };

  for (const ghost of trace.ghosts) {
    if (ghost.pos < start) {
      ghosts.push(ghost);
    } else if (ghost.pos <= end) {
      piece(ghost.pos);
      ghosts.push({ ...ghost, pos: start });
    } else {
      piece(end);
      ghosts.push({ ...ghost, pos: ghost.pos - change.oldSize });
    }
  }

  piece(end);
  return { ...trace, spans, ghosts: pruned(ghosts) };
};

const textOf = (ghosts: readonly Ghost[], back: Return): string =>
  ghosts.reduce(
    (text, ghost) =>
      ghost.cut >= back.oldest && ghost.cut <= back.newest ? text + ghost.text : text,
    '',
  );

const returning = (
  here: readonly Ghost[],
  size: number,
  inserted: () => string,
): Return | undefined => {
  const sizes = here.reduce(
    (known, ghost) => known.set(ghost.cut, (known.get(ghost.cut) ?? 0) + ghost.size),
    new Map<number, number>(),
  );

  const cuts = [...sizes.keys()].toSorted((left, right) => right - left);

  for (let top = 0; top < cuts.length; top += 1) {
    let taken = 0;

    for (let bottom = top; bottom < cuts.length && taken < size; bottom += 1) {
      const back = { oldest: cuts[bottom] ?? 0, newest: cuts[top] ?? 0 };

      taken += sizes.get(back.oldest) ?? 0;

      if (taken === size && textOf(here, back) === inserted()) {
        return back;
      }
    }
  }
  return undefined;
};

const grown = (
  spans: ReadonlyMap<string, Span>,
  start: number,
  size: number,
): Map<string, Span> => {
  const next = new Map<string, Span>();

  for (const [id, span] of spans) {
    const from = span.from >= start ? span.from + size : span.from;

    next.set(id, { from, to: Math.max(from, span.to > start ? span.to + size : span.to) });
  }
  return next;
};

const putIn = (trace: Trace, change: Change): Trace => {
  const { start, newSize, travel } = change;
  const spans = grown(trace.spans, start, newSize);
  const here = trace.ghosts.filter((ghost) => ghost.pos === start && ghost.by === travel);
  const back = here.length === 0 ? undefined : returning(here, newSize, change.inserted);

  if (back === undefined) {
    return {
      ...trace,
      spans,
      ghosts: trace.ghosts.map((ghost) =>
        ghost.pos >= start ? { ...ghost, pos: ghost.pos + newSize } : ghost,
      ),
    };
  }

  const ghosts: Ghost[] = [];
  const revived = new Set(trace.revived);
  let offset = 0;

  for (const ghost of trace.ghosts) {
    if (ghost.pos !== start) {
      ghosts.push(ghost.pos > start ? { ...ghost, pos: ghost.pos + newSize } : ghost);
    } else if (ghost.by !== travel || ghost.cut < back.oldest || ghost.cut > back.newest) {
      ghosts.push({ ...ghost, pos: start + offset });
    } else {
      for (const hold of ghost.holds) {
        const span = spans.get(hold.id);
        const from = start + offset + hold.from;
        const to = start + offset + hold.to;

        if (span === undefined) {
          continue;
        }

        revived.add(hold.id);

        spans.set(
          hold.id,
          span.from === span.to
            ? { from, to }
            : { from: Math.min(span.from, from), to: Math.max(span.to, to) },
        );
      }

      offset += ghost.size;
    }
  }

  return { spans, ghosts, revived };
};

export const drifted = (ghosts: readonly Ghost[], mapper: Mappable): readonly Ghost[] =>
  ghosts.length === 0
    ? ghosts
    : ghosts
        .map((ghost) => ({ ...ghost, pos: mapper.map(ghost.pos, 1) }))
        .toSorted((left, right) => left.pos - right.pos);

const carried = (trace: Trace, map: StepMap): Trace => {
  const spans = new Map<string, Span>();

  for (const [id, span] of trace.spans) {
    const from = map.map(span.from, 1);

    spans.set(id, { from, to: Math.max(from, map.map(span.to, -1)) });
  }

  return { ...trace, spans, ghosts: drifted(trace.ghosts, map) };
};

const staged = (trace: Trace, stage: Stage): Trace => {
  if (stage.kind === StageKind.Move) {
    return carried(trace, stage.map);
  }

  const cut = stage.oldSize > 0 ? cutOut(trace, stage) : trace;

  return stage.newSize > 0 ? putIn(cut, stage) : cut;
};

const stagesOf = (
  tr: Transaction,
  cuts: number,
  travel: HistoryAction | undefined,
): readonly Stage[] => {
  const stages: Stage[] = [];

  tr.mapping.maps.forEach((map, index) => {
    const before = tr.docs[index] ?? tr.before;
    const after = tr.docs[index + 1] ?? tr.doc;

    if (map.kind === StepMapKind.Move) {
      stages.push({ kind: StageKind.Move, map });
      return;
    }

    let shift = 0;

    const shifts = map.ranges.map((range) => {
      const own = shift;

      shift += range.newSize - range.oldSize;
      return own;
    });

    map.ranges.toReversed().forEach((range, reverse) => {
      const moved = shifts[map.ranges.length - 1 - reverse] ?? 0;
      const texts = new Map<string, string>();

      stages.push({
        kind: StageKind.Change,
        start: range.start,
        oldSize: range.oldSize,
        newSize: range.newSize,
        cut: cuts + stages.length + 1,
        travel,
        removed: (from, to) => {
          const key = `${String(from)}:${String(to)}`;
          const text = texts.get(key) ?? before.textBetween(from, to, '');

          texts.set(key, text);
          return text;
        },
        inserted: () =>
          after.textBetween(range.start + moved, range.start + moved + range.newSize, ''),
      });
    });
  });

  return stages;
};

export const traced = (
  trace: Trace,
  tr: Transaction,
  cuts: number,
  travel: HistoryAction | undefined,
): Trace => stagesOf(tr, cuts, travel).reduce(staged, trace);

export const withoutRedo = (ghosts: readonly Ghost[]): readonly Ghost[] =>
  ghosts.some((ghost) => ghost.by === HistoryAction.Redo)
    ? ghosts.filter((ghost) => ghost.by !== HistoryAction.Redo)
    : ghosts;

export const released = (ghosts: readonly Ghost[], id: string): readonly Ghost[] =>
  ghosts.map((ghost) =>
    ghost.holds.some((hold) => hold.id === id)
      ? { ...ghost, holds: ghost.holds.filter((hold) => hold.id !== id) }
      : ghost,
  );
