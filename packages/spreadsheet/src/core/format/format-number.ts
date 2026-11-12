import {
  generalNumber,
  groupDigits,
  roundDigits,
  roundSignificant,
  significantOfAny,
  type Digits,
} from './format-digits';
import {
  CommaRole,
  FormatChar,
  FormatTokenKind,
  type FormatToken,
  type NumberLocale,
} from './format.types';
import { createOutput, pushFill, pushText, type Output } from './output';

type Digit = Extract<FormatToken, { kind: typeof FormatTokenKind.Digit }>;

type Placed = Map<number, string>;

interface Layout {
  readonly integer: readonly number[];
  readonly fraction: readonly number[];
  readonly exponent: readonly number[];
  readonly group: boolean;
  readonly scale: number;
  readonly percent: number;
  readonly exponentAt: number;
  readonly zeros: number;
  readonly engineering: boolean;
  readonly plus: boolean;
}

interface Scientific {
  readonly exponent: number;
  readonly digits: Digits;
}

interface Ratio {
  readonly whole: readonly number[];
  readonly numerator: readonly number[];
  readonly slash: number;
  readonly denominator: readonly number[];
  readonly fixed: number | undefined;
}

interface NumberPlan {
  readonly layout: Layout;
  readonly general: boolean;
  readonly ratio: Ratio | undefined;
}

const LEADING = -1;

const FIXED_DIGIT = /^[0-9]$/u;

const plans = new WeakMap<readonly FormatToken[], NumberPlan>();

const isDigit = (token: FormatToken | undefined): token is Digit =>
  token?.kind === FormatTokenKind.Digit;

const indicesOf = (tokens: readonly FormatToken[], from: number, to: number): number[] => {
  const found: number[] = [];

  for (let index = from; index < to; index += 1) {
    if (!isDigit(tokens[index])) {
      continue;
    }

    found.push(index);
  }
  return found;
};

const padChar = (token: FormatToken | undefined): string => {
  if (!isDigit(token)) {
    return '';
  }
  switch (token.char) {
    case FormatChar.Zero:
      return '0';
    case FormatChar.Question:
      return ' ';
    default:
      return '';
  }
};

const plainChar = (token: FormatToken | undefined): string => {
  if (token?.kind === FormatTokenKind.Literal) {
    return token.text;
  }
  return isDigit(token) ? token.char : '';
};

const commaRole = (
  tokens: readonly FormatToken[],
  at: number,
  layout: { readonly integerEnd: number; readonly end: number },
): CommaRole => {
  const before = indicesOf(tokens, 0, at).length > 0;

  if (!before) {
    return CommaRole.None;
  }
  if (indicesOf(tokens, at + 1, layout.end).length === 0) {
    return CommaRole.Scale;
  }
  return at < layout.integerEnd && indicesOf(tokens, at + 1, layout.integerEnd).length > 0
    ? CommaRole.Group
    : CommaRole.None;
};

const layoutOf = (tokens: readonly FormatToken[]): Layout => {
  const exponentAt = tokens.findIndex((token) => token.kind === FormatTokenKind.Exponent);
  const end = exponentAt < 0 ? tokens.length : exponentAt;

  const pointAt = tokens.findIndex(
    (token, index) => token.kind === FormatTokenKind.Point && index < end,
  );

  const integerEnd = pointAt < 0 ? end : pointAt;
  const integer = indicesOf(tokens, 0, integerEnd);
  let group = false;
  let scale = 0;

  tokens.forEach((token, index) => {
    if (token.kind !== FormatTokenKind.Comma) {
      return;
    }

    const role = commaRole(tokens, index, { integerEnd, end });

    group ||= role === CommaRole.Group;
    scale += Number(role === CommaRole.Scale);
  });

  return {
    integer,
    fraction: pointAt < 0 ? [] : indicesOf(tokens, pointAt + 1, end),
    exponent: exponentAt < 0 ? [] : indicesOf(tokens, exponentAt + 1, tokens.length),
    group,
    scale,
    percent: tokens.reduce(
      (count, token) => count + Number(token.kind === FormatTokenKind.Percent),
      0,
    ),
    exponentAt,
    zeros: integer.reduce(
      (count, slot) => count + Number(padChar(tokens[slot]) === FormatChar.Zero),
      0,
    ),
    engineering:
      integer.length > 1 && integer.some((slot) => padChar(tokens[slot]) !== FormatChar.Zero),
    plus: tokens.some((token) => token.kind === FormatTokenKind.Exponent && token.plus),
  };
};

const denominatorSlots = (tokens: readonly FormatToken[], from: number): number[] => {
  const slots: number[] = [];

  for (let index = from; index < tokens.length; index += 1) {
    const token = tokens[index];
    const fixed = token?.kind === FormatTokenKind.Literal && FIXED_DIGIT.test(token.text);

    if (!isDigit(token) && !fixed) {
      break;
    }
    slots.push(index);
  }
  return slots;
};

const ratioOf = (tokens: readonly FormatToken[]): Ratio | undefined => {
  const slash = tokens.findIndex(
    (token, index) => token.kind === FormatTokenKind.Slash && isDigit(tokens[index - 1]),
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
    first?.kind === FormatTokenKind.Literal
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

const planOf = (tokens: readonly FormatToken[]): NumberPlan => {
  const known = plans.get(tokens);

  if (known !== undefined) {
    return known;
  }

  const plan: NumberPlan = {
    layout: layoutOf(tokens),
    general: tokens.some((token) => token.kind === FormatTokenKind.General),
    ratio: ratioOf(tokens),
  };

  plans.set(tokens, plan);
  return plan;
};

const placeWhole = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
  placed: Placed,
): void => {
  const overflow = Math.max(digits.length - slots.length, 0);

  slots.forEach((slot, index) => {
    const position = index - (slots.length - digits.length);

    if (position < 0) {
      placed.set(slot, padChar(tokens[slot]));
      return;
    }

    placed.set(slot, index === 0 ? digits.slice(0, overflow + 1) : digits.charAt(position));
  });

  if (slots.length > 0 || digits === '') {
    return;
  }

  placed.set(LEADING, digits);
};

const placeGrouped = (layout: Layout, digits: string, separator: string, placed: Placed): void => {
  const text = groupDigits(digits.padStart(layout.zeros, '0'), separator);

  layout.integer.forEach((slot, index) => {
    placed.set(slot, index === 0 ? text : '');
  });
};

const placeFraction = (
  tokens: readonly FormatToken[],
  slots: readonly number[],
  digits: string,
  placed: Placed,
): void => {
  let trimming = true;

  for (let index = slots.length - 1; index >= 0; index -= 1) {
    const slot = slots[index] ?? -1;
    const digit = digits.charAt(index);
    const pad = padChar(tokens[slot]);

    trimming &&= digit === FormatChar.Zero && pad !== FormatChar.Zero;
    placed.set(slot, trimming ? pad : digit);
  }
};

const exponentParts = (value: number, layout: Layout): Scientific => {
  if (value === 0) {
    return { exponent: 0, digits: roundDigits(0, layout.fraction.length) };
  }

  const significant = significantOfAny(value);
  const count = Math.max(layout.integer.length, 1);
  const first = significant.exponent;
  const exponent = layout.engineering ? Math.floor(first / count) * count : first - (count - 1);
  const digits = roundSignificant(significant, layout.fraction.length, exponent);

  if (digits.whole.length <= count) {
    return { exponent, digits };
  }

  const next = exponent + (layout.engineering ? count : 1);

  return { exponent: next, digits: roundSignificant(significant, layout.fraction.length, next) };
};

const renderTokens = (
  tokens: readonly FormatToken[],
  placed: Placed,
  locale: NumberLocale,
  exponentSign: string,
  output: Output,
): void => {
  pushText(output, placed.get(LEADING) ?? '');

  tokens.forEach((token, index) => {
    const text = placed.get(index);

    if (text !== undefined) {
      pushText(output, text);
      return;
    }
    switch (token.kind) {
      case FormatTokenKind.Point:
        pushText(output, locale.decimal);
        break;
      case FormatTokenKind.Percent:
        pushText(output, '%');
        break;
      case FormatTokenKind.Exponent:
        pushText(output, `E${exponentSign}`);
        break;
      case FormatTokenKind.Literal:
        pushText(output, token.text);
        break;
      case FormatTokenKind.Slash:
        pushText(output, '/');
        break;
      case FormatTokenKind.Fill:
        pushFill(output, token.char);
        break;
      default:
        break;
    }
  });
};

const scaled = (value: number, layout: Layout): number =>
  (value * 100 ** layout.percent) / 1000 ** layout.scale;

const placeNumber = (
  tokens: readonly FormatToken[],
  layout: Layout,
  value: number,
  locale: NumberLocale,
  placed: Placed,
): string => {
  const exponent = layout.exponentAt < 0 ? undefined : exponentParts(value, layout);
  const digits = exponent?.digits ?? roundDigits(value, layout.fraction.length);

  if (layout.group) {
    placeGrouped(layout, digits.whole, locale.group, placed);
  } else {
    placeWhole(tokens, layout.integer, digits.whole, placed);
  }
  placeFraction(tokens, layout.fraction, digits.fraction, placed);

  if (exponent === undefined) {
    return '';
  }

  placeWhole(tokens, layout.exponent, String(Math.abs(exponent.exponent)), placed);

  if (exponent.exponent < 0) {
    return '-';
  }
  return layout.plus ? '+' : '';
};

const closest = (fraction: number, limit: number): readonly [number, number] => {
  let best: readonly [number, number] = [Math.round(fraction), 1];
  let error = Math.abs(fraction - best[0]);

  for (let denominator = 2; denominator <= limit && error > 0; denominator += 1) {
    const numerator = Math.round(fraction * denominator);
    const miss = Math.abs(fraction - numerator / denominator);

    if (miss >= error - 1e-12) {
      continue;
    }

    best = [numerator, denominator];
    error = miss;
  }
  return best;
};

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

const placeBlank = (tokens: readonly FormatToken[], ratio: Ratio, placed: Placed): boolean => {
  let anyBlank = false;

  for (const slot of ratio.numerator.concat(ratio.denominator)) {
    const pad = padChar(tokens[slot]);

    anyBlank ||= pad === FormatChar.Space;
    placed.set(slot, pad === '' ? '' : ' ');
  }
  return anyBlank;
};

const placeDenominator = (
  tokens: readonly FormatToken[],
  ratio: Ratio,
  digits: string,
  placed: Placed,
): void => {
  ratio.denominator.forEach((slot, index) => {
    if (ratio.fixed !== undefined) {
      placed.set(slot, plainChar(tokens[slot]));
      return;
    }

    placed.set(slot, index < digits.length ? digits.charAt(index) : padChar(tokens[slot]));
  });
};

const placeRatio = (
  tokens: readonly FormatToken[],
  ratio: Ratio,
  value: number,
  placed: Placed,
): void => {
  const [whole, numerator, denominator] = ratioParts(value, ratio);
  const hidden = numerator === 0 && ratio.whole.length > 0;

  placeWhole(tokens, ratio.whole, whole === 0 && !hidden ? '' : String(whole), placed);

  if (hidden) {
    placed.set(ratio.slash, placeBlank(tokens, ratio, placed) ? ' ' : '');
    return;
  }

  placeWhole(tokens, ratio.numerator, String(numerator), placed);
  placeDenominator(tokens, ratio, String(denominator), placed);
  placed.set(ratio.slash, '/');
};

const generalSection = (
  tokens: readonly FormatToken[],
  value: number,
  locale: NumberLocale,
  negative: boolean,
): Output => {
  const output = createOutput();

  tokens.forEach((token) => {
    if (token.kind === FormatTokenKind.General) {
      pushText(output, generalNumber(negative ? -value : value, locale.decimal));
    } else if (token.kind === FormatTokenKind.Literal) {
      pushText(output, token.text);
    } else if (token.kind === FormatTokenKind.Fill) {
      pushFill(output, token.char);
    }
  });

  return output;
};

export const formatNumberSection = (
  tokens: readonly FormatToken[],
  value: number,
  locale: NumberLocale,
  negative: boolean,
): Output | undefined => {
  const { layout, general, ratio } = planOf(tokens);
  const shown = scaled(value, layout);

  if (!Number.isFinite(shown)) {
    return undefined;
  }
  if (general) {
    return generalSection(tokens, shown, locale, negative);
  }

  const output = createOutput();
  const placed: Placed = new Map();
  let sign = '';

  if (ratio === undefined) {
    sign = placeNumber(tokens, layout, shown, locale, placed);
  } else {
    placeRatio(tokens, ratio, shown, placed);
  }
  if (negative) {
    pushText(output, '-');
  }
  renderTokens(tokens, placed, locale, sign, output);
  return output;
};
