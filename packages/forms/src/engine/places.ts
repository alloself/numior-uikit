import { clamp, identity, range } from 'lodash-es';

export type Relocation = (index: number) => number | undefined;

const isPlace = (length: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < length;

const splicePlace = (length: number, index: number): number =>
  index < 0 ? Math.max(length + index, 0) : Math.min(index, length);

export const movedPlaces = (length: number, from: number, to: number): number[] | undefined => {
  if (!isPlace(length, from)) {
    return undefined;
  }

  const rest = range(length).toSpliced(from, 1);

  return rest.toSpliced(clamp(to, 0, rest.length), 0, from);
};

export const swappedPlaces = (
  length: number,
  first: number,
  second: number,
): number[] | undefined =>
  isPlace(length, first) && isPlace(length, second)
    ? range(length).with(first, second).with(second, first)
    : undefined;

export const keptPlaces: Relocation = identity;

export const droppedPlaces: Relocation = () => undefined;

export const insertedAt = (length: number, index: number): Relocation => {
  const at = splicePlace(length, index);

  return (place) => (place < at ? place : place + 1);
};

export const removedAt = (length: number, index: number): Relocation => {
  const at = splicePlace(length, index);

  return (place) => {
    if (place === at) {
      return undefined;
    }
    return place > at ? place - 1 : place;
  };
};

export const arranged = (places: readonly number[] | undefined): Relocation => {
  if (places === undefined) {
    return keptPlaces;
  }

  const next = new Map(places.map((from, to) => [from, to]));

  return (place) => next.get(place) ?? place;
};
