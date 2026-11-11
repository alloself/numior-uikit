export type Random = () => number;

export const seeded = (seed: number): Random => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    const mixed = Math.imul(state ^ (state >>> 15), state | 1);
    const spread = mixed ^ (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61));

    return ((spread ^ (spread >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const pick = <Item>(random: Random, items: readonly Item[]): Item => {
  const item = items[Math.floor(random() * items.length)];

  if (item === undefined) {
    throw new RangeError('pick needs a list with items');
  }
  return item;
};
