import { shallowRef, type ShallowRef } from 'vue';

export interface VersionRead {
  readonly stamp: number;
  read<T>(get: () => T): T;
}

export interface Version extends VersionRead {
  bump(): void;
}

const tracked = (counter: ShallowRef<number>): number => counter.value;

export const createVersion = (): Version => {
  const counter = shallowRef(0);

  return {
    get stamp() {
      return counter.value;
    },
    read: (get) => {
      tracked(counter);
      return get();
    },
    bump: () => {
      counter.value += 1;
    },
  };
};

export const versionOf = (stamp: () => number): VersionRead => ({
  get stamp() {
    return stamp();
  },
  read: (get) => {
    stamp();
    return get();
  },
});
