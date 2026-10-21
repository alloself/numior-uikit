import { typeOf } from '../model/node';
import type { ContentNode, ElementNode } from '../model/node.types';
import type { ContentExpr } from './content-expression';
import type { ContentMatch } from './schema.types';

interface Edge {
  readonly type: string | null;
  readonly to: number;
}

interface Fragment {
  readonly start: number;
  readonly end: number;
}

interface Automaton {
  readonly edges: Edge[][];
}

export type NameResolver = (name: string) => readonly string[];

const addState = (automaton: Automaton): number => {
  automaton.edges.push([]);
  return automaton.edges.length - 1;
};

const connect = (automaton: Automaton, from: number, type: string | null, to: number): void => {
  automaton.edges[from]?.push({ type, to });
};

const emptyFragment = (automaton: Automaton): Fragment => {
  const start = addState(automaton);
  const end = addState(automaton);

  connect(automaton, start, null, end);
  return { start, end };
};

const chain = (automaton: Automaton, fragments: readonly Fragment[]): Fragment => {
  const first = fragments[0];
  const last = fragments.at(-1);

  if (first === undefined || last === undefined) {
    return emptyFragment(automaton);
  }

  fragments.slice(1).forEach((fragment, index) => {
    connect(automaton, fragments[index]?.end ?? fragment.start, null, fragment.start);
  });

  return { start: first.start, end: last.end };
};

const optional = (automaton: Automaton, fragment: Fragment): Fragment => {
  connect(automaton, fragment.start, null, fragment.end);
  return fragment;
};

const repeated = (
  automaton: Automaton,
  build: () => Fragment,
  min: number,
  max: number,
): Fragment => {
  const required = Array.from({ length: min }, build);

  if (max === Number.POSITIVE_INFINITY) {
    const loop = build();

    connect(automaton, loop.end, null, loop.start);
    return chain(automaton, [...required, optional(automaton, loop)]);
  }
  const extra = Array.from({ length: max - min }, () => optional(automaton, build()));

  return chain(automaton, [...required, ...extra]);
};

const compileExpr = (automaton: Automaton, expr: ContentExpr, resolve: NameResolver): Fragment => {
  switch (expr.kind) {
    case 'name': {
      const start = addState(automaton);
      const end = addState(automaton);

      for (const type of resolve(expr.name)) {
        connect(automaton, start, type, end);
      }
      return { start, end };
    }
    case 'seq':
      return chain(
        automaton,
        expr.items.map((item) => compileExpr(automaton, item, resolve)),
      );
    case 'choice': {
      const start = addState(automaton);
      const end = addState(automaton);

      for (const option of expr.options) {
        const fragment = compileExpr(automaton, option, resolve);

        connect(automaton, start, null, fragment.start);
        connect(automaton, fragment.end, null, end);
      }
      return { start, end };
    }
    case 'repeat':
      return repeated(
        automaton,
        () => compileExpr(automaton, expr.expr, resolve),
        expr.min,
        expr.max,
      );
  }
};

const closureOf = (automaton: Automaton, states: Iterable<number>): number[] => {
  const seen = new Set<number>(states);
  const stack = [...seen];

  for (let state = stack.pop(); state !== undefined; state = stack.pop()) {
    for (const edge of automaton.edges[state] ?? []) {
      if (edge.type === null && !seen.has(edge.to)) {
        seen.add(edge.to);
        stack.push(edge.to);
      }
    }
  }
  return [...seen].toSorted((left, right) => left - right);
};

const movesOf = (automaton: Automaton, states: readonly number[]): Map<string, number[]> => {
  const moves = new Map<string, number[]>();

  for (const state of states) {
    for (const edge of automaton.edges[state] ?? []) {
      if (edge.type !== null) {
        moves.set(edge.type, [...(moves.get(edge.type) ?? []), edge.to]);
      }
    }
  }
  return moves;
};

interface MatchState {
  readonly validEnd: boolean;
  readonly next: Map<string, ContentMatch>;
  readonly match: ContentMatch;
}

const createMatchState = (validEnd: boolean): MatchState => {
  const next = new Map<string, ContentMatch>();

  const match: ContentMatch = {
    validEnd,
    next,
    matchType: (type) => next.get(type),
    matchContent: (content: readonly ContentNode[]) => {
      let current: ContentMatch | undefined = match;

      for (const node of content) {
        current = current?.matchType(typeOf(node));
      }
      return current;
    },
  };

  return { validEnd, next, match };
};

export const compileContent = (expr: ContentExpr, resolve: NameResolver): ContentMatch => {
  const automaton: Automaton = { edges: [] };
  const fragment = compileExpr(automaton, expr, resolve);
  const states = new Map<string, MatchState>();
  const pending: Array<readonly number[]> = [];

  const stateOf = (members: readonly number[]): MatchState => {
    const key = members.join(',');
    const known = states.get(key);

    if (known !== undefined) {
      return known;
    }
    const created = createMatchState(members.includes(fragment.end));

    states.set(key, created);
    pending.push(members);
    return created;
  };

  const first = stateOf(closureOf(automaton, [fragment.start]));

  for (let members = pending.pop(); members !== undefined; members = pending.pop()) {
    const source = stateOf(members);

    for (const [type, targets] of movesOf(automaton, members)) {
      source.next.set(type, stateOf(closureOf(automaton, targets)).match);
    }
  }
  return first.match;
};

const reachable = (match: ContentMatch, follow: (type: string) => boolean): ContentMatch[] => {
  const seen = new Set<ContentMatch>([match]);
  const stack = [match];

  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    for (const [type, target] of current.next) {
      if (follow(type) && !seen.has(target)) {
        seen.add(target);
        stack.push(target);
      }
    }
  }
  return [...seen];
};

export const reachesEnd = (match: ContentMatch, usable: (type: string) => boolean): boolean =>
  reachable(match, usable).some((state) => state.validEnd);

export const typesOf = (match: ContentMatch): Set<string> =>
  new Set(reachable(match, () => true).flatMap((state) => [...state.next.keys()]));

interface MatchStates {
  readonly start: ContentMatch;
  readonly states: readonly (ContentMatch | undefined)[];
}

const statesByNode = new WeakMap<ElementNode, MatchStates>();

const statesOf = (
  start: ContentMatch,
  node: ElementNode,
): readonly (ContentMatch | undefined)[] => {
  const known = statesByNode.get(node);

  if (known?.start === start) {
    return known.states;
  }

  const states: (ContentMatch | undefined)[] = [start];
  let current: ContentMatch | undefined = start;

  for (const child of node.content) {
    current = current?.matchType(typeOf(child));
    states.push(current);
  }
  statesByNode.set(node, { start, states });
  return states;
};

export const matchesSplice = (
  start: ContentMatch,
  node: ElementNode,
  from: number,
  to: number,
  inserted: readonly ContentNode[],
): boolean => {
  const states = statesOf(start, node);
  const { content } = node;
  let current = states[from];

  for (const child of inserted) {
    current = current?.matchType(typeOf(child));
  }
  for (let index = to; index < content.length; index += 1) {
    const child = content[index];

    if (current === undefined || child === undefined) {
      return false;
    }
    if (current === states[index]) {
      return states[content.length]?.validEnd === true;
    }
    current = current.matchType(typeOf(child));
  }
  return current?.validEnd === true;
};
