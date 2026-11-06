import { SignaturePartKind, type SignatureInput, type SignaturePart } from './help.types';

const MORE = '…';

const mark = (text: string): SignaturePart => ({
  kind: SignaturePartKind.Mark,
  text,
  current: false,
});

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
    ...(index === 0 ? [] : [mark(gap)]),
    {
      kind: SignaturePartKind.Argument,
      text: index < input.min ? arg : `[${arg}]`,
      current: index === current,
    },
  ]);

  return [
    { kind: SignaturePartKind.Name, text: input.name, current: false },
    mark('('),
    ...args,
    ...(variadic ? [mark(`${gap}${MORE}`)] : []),
    mark(')'),
  ];
};
