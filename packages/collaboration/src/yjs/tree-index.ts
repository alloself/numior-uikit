import type { Place, PlaceOrigin, TreeIndex } from './yjs.types';

interface Keyed {
  readonly id: string;
  readonly key: string;
}

type CyclePass = (typeof CyclePass)[keyof typeof CyclePass];

export const ROOT_PARENT = '';

const CyclePass = { Open: 1, Done: 2 } as const;

const byKey = (left: Keyed, right: Keyed): number => {
  if (left.key !== right.key) {
    return left.key < right.key ? -1 : 1;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
};

const isLater = (raw: ReadonlyMap<string, Place>, left: string, right: string): boolean => {
  const leftClock = raw.get(left)?.clock ?? 0;
  const rightClock = raw.get(right)?.clock ?? 0;

  return leftClock === rightClock ? left > right : leftClock > rightClock;
};

const latestOf = (raw: ReadonlyMap<string, Place>, cycle: readonly string[]): string | undefined =>
  cycle.reduce<string | undefined>(
    (best, id) => (best === undefined || isLater(raw, id, best) ? id : best),
    undefined,
  );

const samePlace = (left: PlaceOrigin | undefined, right: PlaceOrigin | undefined): boolean =>
  left?.parent === right?.parent && left?.key === right?.key;

export const createTreeIndex = (): TreeIndex => {
  const raw = new Map<string, Place>();
  const overridden = new Map<string, PlaceOrigin>();
  const members = new Map<string, Set<string>>();
  const sorted = new Map<string, readonly string[]>();
  let latest = 0;

  const placeOf = (id: string): PlaceOrigin | undefined => overridden.get(id) ?? raw.get(id);

  const join = (id: string, touched: Set<string>): void => {
    const place = placeOf(id);

    if (place === undefined) {
      return;
    }

    const set = members.get(place.parent);

    if (set === undefined) {
      members.set(place.parent, new Set([id]));
    } else {
      set.add(id);
    }
    sorted.delete(place.parent);
    touched.add(place.parent);
  };

  const part = (id: string, touched: Set<string>): void => {
    const place = placeOf(id);

    if (place === undefined) {
      return;
    }

    members.get(place.parent)?.delete(id);
    sorted.delete(place.parent);
    touched.add(place.parent);
  };

  const onCycle = (id: string): boolean => {
    let seen: Set<string> | undefined;
    let current = placeOf(id)?.parent;

    while (current !== undefined && current !== ROOT_PARENT && seen?.has(current) !== true) {
      if (current === id) {
        return true;
      }
      seen ??= new Set();
      seen.add(current);
      current = placeOf(current)?.parent;
    }
    return false;
  };

  const tangledBy = (changes: ReadonlyMap<string, Place | undefined>): boolean => {
    for (const id of changes.keys()) {
      if (onCycle(id)) {
        return true;
      }
    }
    return false;
  };

  const cyclesOf = (): readonly (readonly string[])[] => {
    const pass = new Map<string, CyclePass>();
    const cycles: string[][] = [];

    for (const start of raw.keys()) {
      const path: string[] = [];
      let current: string | undefined = start;

      while (current !== undefined && raw.has(current) && !pass.has(current)) {
        pass.set(current, CyclePass.Open);
        path.push(current);
        current = placeOf(current)?.parent;
      }

      const closing = current === undefined ? -1 : path.indexOf(current);

      for (const id of path) {
        pass.set(id, CyclePass.Done);
      }
      if (closing < 0) {
        continue;
      }
      cycles.push(path.slice(closing));
    }
    return cycles;
  };

  const revert = (id: string): void => {
    const place = raw.get(id);

    if (place === undefined) {
      return;
    }

    const back = overridden.has(id) ? undefined : place.from;

    overridden.set(id, back ?? { parent: ROOT_PARENT, key: place.key });
  };

  const resolve = (touched: Set<string>): void => {
    const before = new Map(Array.from(raw.keys(), (id) => [id, placeOf(id)]));

    overridden.clear();

    for (let round = 0; round <= raw.size; round += 1) {
      const cycles = cyclesOf();

      if (cycles.length === 0) {
        break;
      }
      for (const cycle of cycles) {
        const latestMove = latestOf(raw, cycle);

        if (latestMove === undefined) {
          continue;
        }
        revert(latestMove);
      }
    }

    members.clear();
    sorted.clear();

    for (const [id, place] of before) {
      const now = placeOf(id);

      if (samePlace(now, place)) {
        continue;
      }
      touched.add(place?.parent ?? ROOT_PARENT);
      touched.add(now?.parent ?? ROOT_PARENT);
    }
    for (const id of raw.keys()) {
      join(id, touched);
    }
  };

  const update = (changes: ReadonlyMap<string, Place | undefined>): ReadonlySet<string> => {
    const touched = new Set<string>();

    for (const [id, place] of changes) {
      part(id, touched);
      overridden.delete(id);

      if (place === undefined) {
        raw.delete(id);
        continue;
      }
      raw.set(id, place);
      latest = Math.max(latest, place.clock);
      join(id, touched);
    }

    if (overridden.size === 0 && !tangledBy(changes)) {
      return touched;
    }
    resolve(touched);
    return touched;
  };

  const childrenOf = (parent: string): readonly string[] => {
    const known = sorted.get(parent);

    if (known !== undefined) {
      return known;
    }

    const keyed = Array.from(members.get(parent) ?? [], (id): Keyed => ({
      id,
      key: placeOf(id)?.key ?? '',
    }));

    const children = keyed.toSorted(byKey).map((child) => child.id);

    sorted.set(parent, children);
    return children;
  };

  return {
    placeOf,
    rawOf: (id) => raw.get(id),
    childrenOf,
    overrides: () => overridden,
    clock: () => latest,
    update,
  };
};
