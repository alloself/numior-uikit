import type { SignatureInput, SignaturePart } from './help.types';

const MORE = '…';

const currentArgument = (input: SignatureInput): number | undefined => {
  const { args, repeat = 1 } = input.help;
  const tail = args.length - repeat;

  if (input.argument >= input.max) {
    return undefined;
  }
  if (input.argument < args.length) {
    return input.argument;
  }
  return tail >= 0 && repeat > 0 ? tail + ((input.argument - tail) % repeat) : undefined;
};

export const signatureOf = (input: SignatureInput): SignaturePart[] => {
  const current = currentArgument(input);
  const gap = `${input.separator} `;
  const variadic = input.max > input.help.args.length;

  const args = input.help.args.flatMap((arg, index): SignaturePart[] => [
    ...(index === 0 ? [] : [{ text: gap, current: false }]),
    { text: index < input.min ? arg : `[${arg}]`, current: index === current },
  ]);

  return [
    { text: `${input.name}(`, current: false },
    ...args,
    ...(variadic ? [{ text: `${gap}${MORE}`, current: false }] : []),
    { text: ')', current: false },
  ];
};
