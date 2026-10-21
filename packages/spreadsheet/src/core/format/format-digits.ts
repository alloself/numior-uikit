const SIGNIFICANT = 15;

export interface Digits {
  readonly whole: string;
  readonly fraction: string;
}

const scaledDigits = (value: number, decimals: number): string => {
  if (value === 0) {
    return '0';
  }

  const [mantissa = '0', exponent = '0'] = value.toExponential(SIGNIFICANT - 1).split('e');
  const digits = mantissa.replace('.', '');
  const keep = Number(exponent) + 1 + decimals;

  if (keep >= SIGNIFICANT) {
    return digits + '0'.repeat(keep - SIGNIFICANT);
  }
  if (keep <= 0) {
    return keep === 0 && digits.charAt(0) >= '5' ? '1' : '0';
  }

  const up = digits.charAt(keep) >= '5' ? 1n : 0n;

  return (BigInt(digits.slice(0, keep)) + up).toString();
};

export const roundDigits = (value: number, decimals: number): Digits => {
  const scaled = scaledDigits(Math.abs(value), decimals).padStart(decimals + 1, '0');
  const whole = scaled.slice(0, scaled.length - decimals).replace(/^0+/u, '');

  return { whole, fraction: scaled.slice(scaled.length - decimals) };
};

export const decimalExponent = (value: number): number =>
  value === 0
    ? 0
    : Number(
        Math.abs(value)
          .toExponential(SIGNIFICANT - 1)
          .split('e')[1],
      );

export const groupDigits = (digits: string, separator: string): string => {
  let result = '';

  for (let index = 0; index < digits.length; index += 1) {
    const left = digits.length - index;

    result += (index > 0 && left % 3 === 0 ? separator : '') + digits.charAt(index);
  }
  return result;
};

const scientific = (value: number, decimal: string, budget: number): string => {
  const first = decimalExponent(value);
  const width = Math.abs(first) >= 100 ? 3 : 2;
  const decimals = Math.max(budget - 4 - width, 0);
  const rounded = roundDigits(value / 10 ** first, decimals);
  const carried = rounded.whole.length > 1;
  const exponent = carried ? first + 1 : first;
  const mantissa = carried ? roundDigits(value / 10 ** exponent, decimals) : rounded;
  const fraction = mantissa.fraction.replace(/0+$/u, '');
  const power = String(Math.abs(exponent)).padStart(2, '0');

  return `${mantissa.whole}${fraction === '' ? '' : decimal + fraction}E${exponent < 0 ? '-' : '+'}${power}`;
};

export const generalNumber = (value: number, decimal: string): string => {
  if (value === 0) {
    return '0';
  }

  const sign = value < 0 ? '-' : '';
  const budget = 11 - sign.length;
  const exponent = decimalExponent(value);
  const decimals = Math.max(budget - Math.max(exponent + 1, 1) - 1, 0);
  const { whole, fraction } = roundDigits(value, decimals);

  if (exponent < -9 || whole.length > budget) {
    return sign + scientific(Math.abs(value), decimal, budget);
  }

  const shown = fraction.replace(/0+$/u, '');

  return sign + (whole === '' ? '0' : whole) + (shown === '' ? '' : decimal + shown);
};
