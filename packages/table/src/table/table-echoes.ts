export interface TableEchoes<V> {
  sent(value: V): void;
  echoed(value: V): boolean;
}

const LIMIT = 8;

export const createEchoes = <V>(same: (a: V, b: V) => boolean): TableEchoes<V> => {
  const pending: V[] = [];

  return {
    sent: (value) => {
      pending.push(value);

      if (pending.length > LIMIT) {
        pending.shift();
      }
    },
    echoed: (value) => {
      const index = pending.findIndex((sent) => same(sent, value));

      if (index < 0) {
        return false;
      }
      pending.splice(0, index + 1);
      return true;
    },
  };
};
