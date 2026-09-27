import type { NuiCodeLine } from './code.types';

export const codeLines = (
  code: string,
  tokens: readonly NuiCodeLine[] | undefined,
): readonly NuiCodeLine[] => {
  const lines = code.split('\n');

  if (lines.length > 1 && lines.at(-1) === '') {
    lines.pop();
  }
  if (tokens !== undefined && tokens.length === lines.length) {
    return tokens;
  }
  return lines.map((text) => [{ text }]);
};
