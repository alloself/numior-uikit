export interface Digits {
  readonly whole: string;
  readonly fraction: string;
}

export interface Significant {
  readonly digits: string;
  readonly exponent: number;
}

const SIGNIFICANT = 15;

const GENERAL_WIDTH = 11;

const EXACT_DECIMALS = 12;

const NINE = '9';

const HALF = '5';

const ZERO: Significant = { digits: '0'.repeat(SIGNIFICANT), exponent: 0 };

const significantOf = (value: number): Significant => {
  const text = value.toExponential(SIGNIFICANT - 1);
  const at = text.indexOf('e');

  return { digits: text.charAt(0) + text.slice(2, at), exponent: Number(text.slice(at + 1)) };
};

const roundedUp = (digits: string): string => {
  let index = digits.length - 1;

  while (index >= 0 && digits.charAt(index) === NINE) {
    index -= 1;
  }
  if (index < 0) {
    return `1${'0'.repeat(digits.length)}`;
  }
  return (
    digits.slice(0, index) +
    String(Number(digits.charAt(index)) + 1) +
    '0'.repeat(digits.length - index - 1)
  );
};

const scaledDigits = (significant: Significant, decimals: number, power: number): string => {
  const { digits } = significant;
  const keep = significant.exponent - power + 1 + decimals;

  if (keep >= SIGNIFICANT) {
    return digits + '0'.repeat(keep - SIGNIFICANT);
  }
  if (keep <= 0) {
    return keep === 0 && digits.charAt(0) >= HALF ? '1' : '0';
  }

  const kept = digits.slice(0, keep);

  return digits.charAt(keep) >= HALF ? roundedUp(kept) : kept;
};

export const roundSignificant = (
  significant: Significant,
  decimals: number,
  power: number,
): Digits => {
  const scaled = scaledDigits(significant, decimals, power).padStart(decimals + 1, '0');
  const whole = scaled.slice(0, scaled.length - decimals).replace(/^0+/u, '');

  return { whole, fraction: scaled.slice(scaled.length - decimals) };
};

export const significantOfAny = (value: number): Significant =>
  value === 0 ? ZERO : significantOf(Math.abs(value));

export const roundDigits = (value: number, decimals: number, power = 0): Digits =>
  roundSignificant(significantOfAny(value), decimals, power);

export const groupDigits = (digits: string, separator: string): string => {
  const rest = digits.length % 3;
  const head = rest === 0 ? 3 : rest;
  let result = digits.slice(0, head);

  for (let index = head; index < digits.length; index += 3) {
    result += separator + digits.slice(index, index + 3);
  }
  return result;
};

const scientific = (significant: Significant, decimal: string): string => {
  const first = significant.exponent;
  const width = Math.abs(first) >= 100 ? 3 : 2;
  const decimals = GENERAL_WIDTH - 4 - width;
  const rounded = roundSignificant(significant, decimals, first);
  const carried = rounded.whole.length > 1;
  const exponent = carried ? first + 1 : first;
  const mantissa = carried ? roundSignificant(significant, decimals, exponent) : rounded;
  const fraction = mantissa.fraction.replace(/0+$/u, '');
  const power = String(Math.abs(exponent)).padStart(2, '0');

  return `${mantissa.whole}${fraction === '' ? '' : decimal + fraction}E${exponent < 0 ? '-' : '+'}${power}`;
};

const losesSmallDigits = (significant: Significant): boolean =>
  significant.exponent < -4 &&
  roundSignificant(significant, EXACT_DECIMALS, 0).fraction.replace(/0+$/u, '').length >
    GENERAL_WIDTH - 2;

export const generalNumber = (value: number, decimal: string): string => {
  if (value === 0) {
    return '0';
  }

  const sign = value < 0 ? '-' : '';
  const significant = significantOf(Math.abs(value));
  const { exponent } = significant;
  const decimals = Math.max(GENERAL_WIDTH - Math.max(exponent + 1, 1) - 1, 0);
  const { whole, fraction } = roundSignificant(significant, decimals, 0);

  if (exponent < -9 || whole.length > GENERAL_WIDTH || losesSmallDigits(significant)) {
    return sign + scientific(significant, decimal);
  }

  const shown = fraction.replace(/0+$/u, '');

  return sign + (whole === '' ? '0' : whole) + (shown === '' ? '' : decimal + shown);
};
