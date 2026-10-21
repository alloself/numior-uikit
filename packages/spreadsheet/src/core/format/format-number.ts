import {
  decimalExponent,
  generalNumber,
  groupDigits,
  roundDigits,
  type Digits,
} from './format-digits';
import type { FormatToken, NumberLocale } from './format.types';
import { createOutput, type Output } from './output';

type Digit = Extract<FormatToken, { kind: 'digit' }>;

interface Layout {
  readonly integer: readonly number[];
  readonly fraction: readonly number[];
  readonly exponent: readonly number[];
  readonly group: boolean;
  readonly scale: number;
  readonly percent: number;
  readonly exponentAt: number;
}

const LEADING = -1;

const isDigit = (token: FormatToken | undefined): token is Digit => token?.kind === 'digit';

const indicesOf = (tokens: readonly FormatToken[], from: number, to: number): number[] => {
  const found: number[] = [];

  for (let index = from; index < to; index += 1) {
    if (isDigit(tokens[index])) {
      found.push(index);
    }
  }
  return found;
};

const commaRole = (
  tokens: readonly FormatToken[],
  at: number,
  layout: { readonly integerEnd: number; readonly end: number },
): 'group' | 'scale' | 'none' => {
  const before = indicesOf(tokens, 0, at).length > 0;

  if (!before) {
    return 'none';
  }
  if (indicesOf(tokens, at + 1, layout.end).length === 0) {
    return 'scale';
  }
  return at < layout.integerEnd && indicesOf(tokens, at + 1, layout.integerEnd).length > 0
    ? 'group'
    : 'none';
};

const layoutOf = (tokens: readonly FormatToken[]): Layout => {
  const exponentAt = tokens.findIndex((token) => token.kind === 'exponent');
  const end = exponentAt < 0 ? tokens.length : exponentAt;
  const pointAt = tokens.findIndex((token, index) => token.kind === 'point' && index < end);
  const integerEnd = pointAt < 0 ? end : pointAt;
  let group = false;
  let scale = 0;

  tokens.forEach((token, index) => {
    if (token.kind === 'comma') {
      const role = commaRole(tokens, index, { integerEnd, end });

      group ||= role === 'group';
      scale += Number(role === 'scale');
    }
  });

  return {
    integer: indicesOf(tokens, 0, integerEnd),
    fraction: pointAt < 0 ? [] : indicesOf(tokens, pointAt + 1, end),
    exponent: exponentAt < 0 ? [] : indicesOf(tokens, exponentAt + 1, tokens.length),
    group,
    scale,
    percent: tokens.filter((token) => token.kind === 'percent').length,
    exponentAt,
  };
};

const padChar = (token: FormatToken | undefined): string => {
  if (!isDigit(token)) {
    return '';
  }
  switch (token.char) {
    case '0':
      return '0';
    case '?':
      return ' ';
    default:
      return '';
  }
};

const placeWhole = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
): Map<number, string> => {
  const placed = new Map<number, string>();
  const overflow = Math.max(digits.length - slots.length, 0);

  slots.forEach((slot, index) => {
    const position = index - (slots.length - digits.length);

    if (position < 0) {
      placed.set(slot, padChar(tokens[slot]));
    } else {
      placed.set(slot, index === 0 ? digits.slice(0, overflow + 1) : digits.charAt(position));
    }
  });

  if (slots.length === 0 && digits !== '') {
    placed.set(LEADING, digits);
  }
  return placed;
};

const groupedWhole = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
  separator: string,
): Map<number, string> => {
  const zeros = slots.filter((slot) => padChar(tokens[slot]) === '0').length;
  const text = groupDigits(digits.padStart(zeros, '0'), separator);

  return new Map(slots.map((slot, index) => [slot, index === 0 ? text : '']));
};

const placeFraction = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
): Map<number, string> => {
  const placed = new Map<number, string>();
  let trimming = true;

  for (let index = slots.length - 1; index >= 0; index -= 1) {
    const slot = slots[index] ?? -1;
    const digit = digits.charAt(index);
    const pad = padChar(tokens[slot]);

    trimming &&= digit === '0' && pad !== '0';
    placed.set(slot, trimming ? pad : digit);
  }
  return placed;
};

interface Scientific {
  readonly exponent: number;
  readonly digits: Digits;
}

const exponentParts = (
  value: number,
  layout: Layout,
  tokens: readonly FormatToken[],
): Scientific => {
  if (value === 0) {
    return { exponent: 0, digits: roundDigits(0, layout.fraction.length) };
  }

  const count = Math.max(layout.integer.length, 1);
  const engineering = count > 1 && layout.integer.some((slot) => padChar(tokens[slot]) !== '0');
  const first = decimalExponent(value);
  const exponent = engineering ? Math.floor(first / count) * count : first - (count - 1);
  const digits = roundDigits(value / 10 ** exponent, layout.fraction.length);

  if (digits.whole.length <= count) {
    return { exponent, digits };
  }

  const next = exponent + (engineering ? count : 1);

  return { exponent: next, digits: roundDigits(value / 10 ** next, layout.fraction.length) };
};

const renderTokens = (
  tokens: readonly FormatToken[],
  placed: ReadonlyMap<number, string>,
  locale: NumberLocale,
  exponentSign: string,
  output: Output,
): void => {
  output.push(placed.get(LEADING) ?? '');

  tokens.forEach((token, index) => {
    const text = placed.get(index);

    if (text !== undefined) {
      output.push(text);
      return;
    }
    switch (token.kind) {
      case 'point':
        output.push(locale.decimal);
        break;
      case 'percent':
        output.push('%');
        break;
      case 'exponent':
        output.push(`E${exponentSign}`);
        break;
      case 'literal':
        output.push(token.text);
        break;
      case 'slash':
        output.push('/');
        break;
      case 'fill':
        output.fill(token.char);
        break;
      default:
        break;
    }
  });
};

const scaled = (value: number, layout: Layout): number =>
  (value * 100 ** layout.percent) / 1000 ** layout.scale;

const plainNumber = (
  tokens: readonly FormatToken[],
  layout: Layout,
  value: number,
  locale: NumberLocale,
): { readonly placed: Map<number, string>; readonly sign: string } => {
  const exponent = layout.exponentAt < 0 ? undefined : exponentParts(value, layout, tokens);
  const digits = exponent?.digits ?? roundDigits(value, layout.fraction.length);

  const whole = layout.group
    ? groupedWhole(tokens, layout.integer, digits.whole, locale.group)
    : placeWhole(tokens, layout.integer, digits.whole);

  const placed = new Map([...whole, ...placeFraction(tokens, layout.fraction, digits.fraction)]);

  if (exponent !== undefined) {
    const power = String(Math.abs(exponent.exponent));

    placeWhole(tokens, layout.exponent, power).forEach((text, slot) => placed.set(slot, text));
  }

  const sign = exponent === undefined || exponent.exponent >= 0 ? '' : '-';
  const plus = tokens.some((token) => token.kind === 'exponent' && token.plus);

  return { placed, sign: sign === '' && plus ? '+' : sign };
};

interface Ratio {
  readonly whole: readonly number[];
  readonly numerator: readonly number[];
  readonly slash: number;
  readonly denominator: readonly number[];
  readonly fixed: number | undefined;
}

const FIXED_DIGIT = /^[0-9]$/u;

const denominatorSlots = (tokens: readonly FormatToken[], from: number): number[] => {
  const slots: number[] = [];

  for (let index = from; index < tokens.length; index += 1) {
    const token = tokens[index];
    const fixed = token?.kind === 'literal' && FIXED_DIGIT.test(token.text);

    if (!isDigit(token) && !fixed) {
      break;
    }
    slots.push(index);
  }
  return slots;
};

const ratioOf = (tokens: readonly FormatToken[]): Ratio | undefined => {
  const slash = tokens.findIndex(
    (token, index) => token.kind === 'slash' && isDigit(tokens[index - 1]),
  );

  if (slash < 0) {
    return undefined;
  }

  let start = slash;

  while (isDigit(tokens[start - 1])) {
    start -= 1;
  }

  const denominator = denominatorSlots(tokens, slash + 1);
  const first = tokens[denominator[0] ?? -1];

  const fixed =
    first?.kind === 'literal'
      ? Number(denominator.map((slot) => plainChar(tokens[slot])).join(''))
      : undefined;

  return {
    whole: indicesOf(tokens, 0, start),
    numerator: indicesOf(tokens, start, slash),
    slash,
    denominator,
    fixed,
  };
};

const plainChar = (token: FormatToken | undefined): string => {
  if (token?.kind === 'literal') {
    return token.text;
  }
  return isDigit(token) ? token.char : '';
};

const closest = (fraction: number, limit: number): readonly [number, number] => {
  let best: readonly [number, number] = [Math.round(fraction), 1];
  let error = Math.abs(fraction - best[0]);

  for (let denominator = 2; denominator <= limit && error > 0; denominator += 1) {
    const numerator = Math.round(fraction * denominator);
    const miss = Math.abs(fraction - numerator / denominator);

    if (miss < error - 1e-12) {
      best = [numerator, denominator];
      error = miss;
    }
  }
  return best;
};

const blankSlots = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
): Map<number, string> =>
  new Map(slots.map((slot) => [slot, padChar(tokens[slot]) === '' ? '' : ' ']));

const leftAligned = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
): Map<number, string> =>
  new Map(
    slots.map((slot, index) => [
      slot,
      index < digits.length ? digits.charAt(index) : padChar(tokens[slot]),
    ]),
  );

const ratioParts = (value: number, ratio: Ratio): readonly [number, number, number] => {
  const whole = ratio.whole.length > 0 ? Math.floor(value) : 0;
  const rest = value - whole;

  const [numerator, denominator] =
    ratio.fixed === undefined
      ? closest(rest, 10 ** ratio.denominator.length - 1)
      : [Math.round(rest * ratio.fixed), ratio.fixed];

  return numerator === denominator && ratio.whole.length > 0
    ? [whole + 1, 0, denominator]
    : [whole, numerator, denominator];
};

const ratioPlaced = (
  tokens: readonly FormatToken[],
  ratio: Ratio,
  value: number,
): Map<number, string> => {
  const [whole, numerator, denominator] = ratioParts(value, ratio);
  const hidden = numerator === 0 && ratio.whole.length > 0;
  const wholeText = whole === 0 && !hidden ? '' : String(whole);
  const slots = [...ratio.numerator, ...ratio.denominator];
  const anyBlank = slots.some((slot) => padChar(tokens[slot]) === ' ');

  const tail = hidden
    ? blankSlots(tokens, slots)
    : new Map([
        ...placeWhole(tokens, ratio.numerator, String(numerator)),
        ...(ratio.fixed === undefined
          ? leftAligned(tokens, ratio.denominator, String(denominator))
          : new Map(ratio.denominator.map((slot) => [slot, plainChar(tokens[slot])]))),
      ]);

  const placed = new Map([...placeWhole(tokens, ratio.whole, wholeText), ...tail]);

  placed.set(ratio.slash, hidden ? (anyBlank ? ' ' : '') : '/');
  return placed;
};

const generalSection = (
  tokens: readonly FormatToken[],
  value: number,
  locale: NumberLocale,
  negative: boolean,
): Output => {
  const output = createOutput();

  tokens.forEach((token) => {
    if (token.kind === 'general') {
      output.push(generalNumber(negative ? -value : value, locale.decimal));
    } else if (token.kind === 'literal') {
      output.push(token.text);
    } else if (token.kind === 'fill') {
      output.fill(token.char);
    }
  });

  return output;
};

export const formatNumberSection = (
  tokens: readonly FormatToken[],
  value: number,
  locale: NumberLocale,
  negative: boolean,
): Output => {
  const output = createOutput();
  const layout = layoutOf(tokens);
  const shown = scaled(value, layout);

  if (tokens.some((token) => token.kind === 'general')) {
    return generalSection(tokens, shown, locale, negative);
  }

  const ratio = ratioOf(tokens);

  const { placed, sign } =
    ratio === undefined
      ? plainNumber(tokens, layout, shown, locale)
      : { placed: ratioPlaced(tokens, ratio, shown), sign: '' };

  if (negative) {
    output.push('-');
  }
  renderTokens(tokens, placed, locale, sign, output);
  return output;
};
