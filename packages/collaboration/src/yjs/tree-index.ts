import type { Place, PlaceOrigin, TreeIndex } from './yjs.types';

type CyclePass = (typeof CyclePass)[keyof typeof CyclePass];

export const ROOT_PARENT = '';

const CyclePass = { Open: 1, Done: 2 } as const;

const byKey =
  (placeOf: (id: string) => PlaceOrigin | undefined) =>
  (left: string, right: string): number => {
    const leftKey = placeOf(left)?.key ?? '';
    const rightKey = placeOf(right)?.key ?? '';

    if (leftKey !== rightKey) {
      return leftKey < rightKey ? -1 : 1;
    }
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
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

    const set = members.get(place.parent) ?? new Set<string>();

    set.add(id);
    members.set(place.parent, set);
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
    const seen = new Set<string>();
    let current = placeOf(id)?.parent;

    while (current !== undefined && current !== ROOT_PARENT && !seen.has(current)) {
      if (current === id) {
        return true;
      }
      seen.add(current);
      current = placeOf(current)?.parent;
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

    const tangled = Array.from(changes.keys()).some(onCycle);

    if (overridden.size === 0 && !tangled) {
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

    const children = Array.from(members.get(parent) ?? []).toSorted(byKey(placeOf));

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
