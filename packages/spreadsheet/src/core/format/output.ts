import type { FormatFill } from './format.types';

export interface Output {
  text: string;
  filler: FormatFill | undefined;
}

export const createOutput = (): Output => ({ text: '', filler: undefined });

export const pushText = (output: Output, part: string): void => {
  output.text += part;
};

export const pushFill = (output: Output, char: string): void => {
  output.filler ??= { char, at: output.text.length };
};
