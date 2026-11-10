export interface Digits {
  readonly whole: string;
  readonly fraction: string;
}

interface Significant {
  readonly digits: string;
  readonly exponent: number;
}

const SIGNIFICANT = 15;

const GENERAL_WIDTH = 11;

const EXACT_DECIMALS = 12;

const significantOf = (value: number): Significant => {
  const [mantissa = '0', exponent = '0'] = value.toExponential(SIGNIFICANT - 1).split('e');

  return { digits: mantissa.replace('.', ''), exponent: Number(exponent) };
};

const scaledDigits = (value: number, decimals: number, power: number): string => {
  if (value === 0) {
    return '0';
  }

  const { digits, exponent } = significantOf(value);
  const keep = exponent - power + 1 + decimals;

  if (keep >= SIGNIFICANT) {
    return digits + '0'.repeat(keep - SIGNIFICANT);
  }
  if (keep <= 0) {
    return keep === 0 && digits.charAt(0) >= '5' ? '1' : '0';
  }

  const up = digits.charAt(keep) >= '5' ? 1n : 0n;

  return (BigInt(digits.slice(0, keep)) + up).toString();
};

export const roundDigits = (value: number, decimals: number, power = 0): Digits => {
  const scaled = scaledDigits(Math.abs(value), decimals, power).padStart(decimals + 1, '0');
  const whole = scaled.slice(0, scaled.length - decimals).replace(/^0+/u, '');

  return { whole, fraction: scaled.slice(scaled.length - decimals) };
};

export const decimalExponent = (value: number): number =>
  value === 0 ? 0 : significantOf(Math.abs(value)).exponent;

export const groupDigits = (digits: string, separator: string): string => {
  let result = '';

  for (let index = 0; index < digits.length; index += 1) {
    const left = digits.length - index;

    result += (index > 0 && left % 3 === 0 ? separator : '') + digits.charAt(index);
  }
  return result;
};

const scientific = (value: number, decimal: string): string => {
  const first = decimalExponent(value);
  const width = Math.abs(first) >= 100 ? 3 : 2;
  const decimals = GENERAL_WIDTH - 4 - width;
  const rounded = roundDigits(value, decimals, first);
  const carried = rounded.whole.length > 1;
  const exponent = carried ? first + 1 : first;
  const mantissa = carried ? roundDigits(value, decimals, exponent) : rounded;
  const fraction = mantissa.fraction.replace(/0+$/u, '');
  const power = String(Math.abs(exponent)).padStart(2, '0');

  return `${mantissa.whole}${fraction === '' ? '' : decimal + fraction}E${exponent < 0 ? '-' : '+'}${power}`;
};

const losesSmallDigits = (value: number, exponent: number): boolean =>
  exponent < -4 &&
  roundDigits(value, EXACT_DECIMALS).fraction.replace(/0+$/u, '').length > GENERAL_WIDTH - 2;

export const generalNumber = (value: number, decimal: string): string => {
  if (value === 0) {
    return '0';
  }

  const sign = value < 0 ? '-' : '';
  const exponent = decimalExponent(value);
  const decimals = Math.max(GENERAL_WIDTH - Math.max(exponent + 1, 1) - 1, 0);
  const { whole, fraction } = roundDigits(value, decimals);

  if (exponent < -9 || whole.length > GENERAL_WIDTH || losesSmallDigits(value, exponent)) {
    return sign + scientific(Math.abs(value), decimal);
  }

  const shown = fraction.replace(/0+$/u, '');

  return sign + (whole === '' ? '0' : whole) + (shown === '' ? '' : decimal + shown);
};
