export const onlyIf = <T>(condition: boolean, item: () => T): T[] => (condition ? [item()] : []);

export const ifDefined = <V, T>(value: V | undefined, item: (value: V) => T): T[] =>
  value === undefined ? [] : [item(value)];
