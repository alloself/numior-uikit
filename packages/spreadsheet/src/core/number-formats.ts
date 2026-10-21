export interface NumberFormats {
  id(code: string): number;
  code(id: number): string;
  readonly size: number;
}

const GENERAL = 'General';

const LIMIT = 65_535;

export const createNumberFormats = (): NumberFormats => {
  const codes: string[] = [GENERAL];
  const ids = new Map<string, number>([[GENERAL, 0]]);

  return {
    id: (code) => {
      const known = ids.get(code === '' ? GENERAL : code);

      if (known !== undefined) {
        return known;
      }
      if (codes.length > LIMIT) {
        throw new RangeError('A workbook holds at most 65 535 number formats');
      }
      ids.set(code, codes.length);
      codes.push(code);
      return codes.length - 1;
    },
    code: (id) => codes[id] ?? GENERAL,
    get size() {
      return codes.length;
    },
  };
};
