import type { NuiCodeLine } from '@numior/primitives';

const fittedTokens = (
  tokens: readonly NuiCodeLine[] | undefined,
  count: number,
  closed: boolean,
): readonly NuiCodeLine[] | undefined => {
  const trailing = closed && tokens?.length === count + 1 && tokens.at(-1)?.length === 0;

  return trailing ? tokens.slice(0, count) : tokens;
};

export const codeLines = (
  code: string,
  tokens: readonly NuiCodeLine[] | undefined,
): readonly NuiCodeLine[] => {
  const lines = code.split('\n');
  const closed = lines.length > 1 && lines.at(-1) === '';

  if (closed) {
    lines.pop();
  }

  const fitted = fittedTokens(tokens, lines.length, closed);

  return fitted !== undefined && fitted.length === lines.length
    ? fitted
    : lines.map((text) => [{ text }]);
};
