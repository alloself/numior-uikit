import type { FormatFill } from './format.types';

export interface Output {
  push(text: string): void;
  fill(char: string): void;
  readonly text: string;
  readonly filler: FormatFill | undefined;
}

export const createOutput = (): Output => {
  let text = '';
  let filler: FormatFill | undefined;

  return {
    push: (part) => {
      text += part;
    },
    fill: (char) => {
      filler ??= { char, at: text.length };
    },
    get text() {
      return text;
    },
    get filler() {
      return filler;
    },
  };
};
