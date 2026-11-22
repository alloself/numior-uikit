const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = '0';
const LAST = 'z';
const BASE = DIGITS.length;
const TAG_LENGTH = 6;
const INTEGER_DIGITS = 26;
const SMALLEST = `A${ZERO.repeat(INTEGER_DIGITS)}`;
const FIRST_KEY = `a${ZERO}`;
const KEY_DIGITS = /^[0-9A-Za-z]*$/u;

const digitOf = (char: string | undefined): number =>
  char === undefined ? -1 : DIGITS.indexOf(char);

const digitChar = (digit: number): string => DIGITS.charAt(digit);

const codeOf = (char: string): number => char.charCodeAt(0);

const integerLength = (head: string | undefined): number => {
  if (head === undefined) {
    return 0;
  }
  if (head >= 'a' && head <= 'z') {
    return codeOf(head) - codeOf('a') + 2;
  }
  return head >= 'A' && head <= 'Z' ? codeOf('Z') - codeOf(head) + 2 : 0;
};

const integerOf = (key: string): string => key.slice(0, integerLength(key[0]));

export const isOrderKey = (key: unknown): key is string => {
  if (typeof key !== 'string') {
    return false;
  }

  const length = integerLength(key[0]);

  return (
    length > 0 &&
    key.length >= length &&
    key !== SMALLEST &&
    KEY_DIGITS.test(key.slice(1)) &&
    !key.slice(length).endsWith(ZERO)
  );
};

const sharedLength = (low: string, high: string): number => {
  let shared = 0;

  while ((low[shared] ?? ZERO) === high[shared]) {
    shared += 1;
  }
  return shared;
};

const midpoint = (low: string, high: string | undefined): string => {
  const shared = high === undefined ? 0 : sharedLength(low, high);

  if (high !== undefined && shared > 0) {
    return high.slice(0, shared) + midpoint(low.slice(shared), high.slice(shared));
  }

  const lowDigit = low === '' ? 0 : digitOf(low[0]);
  const highDigit = high === undefined ? BASE : digitOf(high[0]);

  if (highDigit - lowDigit > 1) {
    return digitChar(Math.round((lowDigit + highDigit) / 2));
  }
  if (high !== undefined && high.length > 1) {
    return high.slice(0, 1);
  }
  return digitChar(lowDigit) + midpoint(low.slice(1), undefined);
};

const incremented = (integer: string): string | undefined => {
  const head = integer.charAt(0);
  const digits = integer.slice(1).split('');
  let index = digits.length - 1;

  while (index >= 0 && digits[index] === LAST) {
    digits[index] = ZERO;
    index -= 1;
  }
  if (index >= 0) {
    digits[index] = digitChar(digitOf(digits[index]) + 1);
    return head + digits.join('');
  }
  if (head === 'Z') {
    return FIRST_KEY;
  }
  if (head === 'z') {
    return undefined;
  }

  const next = String.fromCharCode(codeOf(head) + 1);

  return next > 'a' ? `${next}${digits.join('')}${ZERO}` : next + digits.slice(1).join('');
};

const decremented = (integer: string): string | undefined => {
  const head = integer.charAt(0);
  const digits = integer.slice(1).split('');
  let index = digits.length - 1;

  while (index >= 0 && digits[index] === ZERO) {
    digits[index] = LAST;
    index -= 1;
  }
  if (index >= 0) {
    digits[index] = digitChar(digitOf(digits[index]) - 1);
    return head + digits.join('');
  }
  if (head === 'a') {
    return `Z${LAST}`;
  }
  if (head === 'A') {
    return undefined;
  }

  const previous = String.fromCharCode(codeOf(head) - 1);

  return previous < 'Z'
    ? `${previous}${digits.join('')}${LAST}`
    : previous + digits.slice(1).join('');
};

const keyBefore = (after: string): string => {
  const integer = integerOf(after);
  const fraction = after.slice(integer.length);

  if (integer === SMALLEST) {
    return integer + midpoint('', fraction);
  }
  if (integer < after) {
    return integer;
  }
  return decremented(integer) ?? integer + midpoint('', fraction);
};

const keyAfter = (before: string): string => {
  const integer = integerOf(before);

  return incremented(integer) ?? integer + midpoint(before.slice(integer.length), undefined);
};

const keyBetween = (before: string | undefined, after: string | undefined): string => {
  if (before === undefined) {
    return after === undefined ? FIRST_KEY : keyBefore(after);
  }
  if (after === undefined) {
    return keyAfter(before);
  }

  const low = integerOf(before);
  const high = integerOf(after);

  if (low === high) {
    return low + midpoint(before.slice(low.length), after.slice(high.length));
  }

  const next = incremented(low);

  return next !== undefined && next < after
    ? next
    : low + midpoint(before.slice(low.length), undefined);
};

const anchorBetween = (before: string | undefined, after: string | undefined): string => {
  let key = keyBetween(before, after);

  while (after?.startsWith(key) === true) {
    key = keyBetween(before, key);
  }
  return key;
};

const fractions = (low: string, high: string | undefined, count: number): readonly string[] => {
  if (count === 0) {
    return [];
  }

  const middle = midpoint(low, high);
  const left = Math.floor((count - 1) / 2);

  return [...fractions(low, middle, left), middle, ...fractions(middle, high, count - 1 - left)];
};

export const keysBetween = (
  before: string | undefined,
  after: string | undefined,
  count: number,
  tag: string,
): readonly string[] => {
  if (count === 0) {
    return [];
  }

  const base = anchorBetween(before, after) + tag;

  return fractions('', undefined, count).map((fraction) => base + fraction);
};

export const clientTag = (client: number): string => {
  let rest = Math.abs(Math.trunc(client)) % BASE ** TAG_LENGTH;

  return Array.from({ length: TAG_LENGTH }, () => {
    const digit = rest % BASE;

    rest = Math.floor(rest / BASE);
    return digitChar(digit);
  })
    .toReversed()
    .join('');
};
