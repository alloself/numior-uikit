export type SlotMap = ReadonlyMap<number, number>;

export const assignSlots = (previous: SlotMap, indices: readonly number[]): Map<number, number> => {
  const next = new Map<number, number>();
  const taken = new Set<number>();

  for (const index of indices) {
    const slot = previous.get(index);

    if (slot === undefined || taken.has(slot)) {
      continue;
    }

    next.set(index, slot);
    taken.add(slot);
  }
  let free = 0;

  for (const index of indices) {
    if (next.has(index)) {
      continue;
    }
    while (taken.has(free)) {
      free += 1;
    }
    next.set(index, free);
    taken.add(free);
  }
  return next;
};
