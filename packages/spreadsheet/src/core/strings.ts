export interface SharedStrings {
  intern(text: string): number;
  text(id: number): string;
  readonly size: number;
}

export const createSharedStrings = (): SharedStrings => {
  const ids = new Map<string, number>();
  const texts: string[] = [];

  return {
    intern: (text) => {
      const known = ids.get(text);

      if (known !== undefined) {
        return known;
      }
      texts.push(text);
      ids.set(text, texts.length - 1);
      return texts.length - 1;
    },
    text: (id) => texts[id] ?? '',
    get size() {
      return texts.length;
    },
  };
};
