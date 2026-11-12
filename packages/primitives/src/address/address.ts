const LETTERS = 26;
const CODE_A = 65;
const CODE_Z = 90;

export const columnName = (index: number): string => {
  let name = '';

  for (let rest = Math.floor(index) + 1; rest > 0; rest = Math.floor((rest - 1) / LETTERS)) {
    name = String.fromCodePoint(CODE_A + ((rest - 1) % LETTERS)) + name;
  }
  return name;
};

export const columnIndex = (name: string): number | undefined => {
  let index = 0;

  for (const letter of name.toUpperCase()) {
    const code = letter.codePointAt(0) ?? 0;

    if (code < CODE_A || code > CODE_Z) {
      return undefined;
    }
    index = index * LETTERS + (code - CODE_A + 1);
  }
  return index > 0 ? index - 1 : undefined;
};
