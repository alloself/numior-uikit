import { datePatternOf } from './text';
import { graphemesOf } from '../intl/graphemes';
import { DateTimePart } from '../intl/intl.types';
import { DateField, DateMaskField, DateMaskPartKind } from './date.types';

export type DateMaskPart =
  | {
      readonly kind: typeof DateMaskPartKind.Digits;
      readonly field: DateMaskField;
      readonly length: number;
    }
  | { readonly kind: typeof DateMaskPartKind.Literal; readonly text: string };

export interface MaskedDateText {
  readonly text: string;
  readonly caret: number;
}

type DigitsPart = Extract<DateMaskPart, { kind: typeof DateMaskPartKind.Digits }>;

interface Segment {
  readonly part: DigitsPart;
  readonly start: number;
  readonly end: number;
  readonly next: string | undefined;
}

interface MaskRun {
  readonly chars: readonly string[];
  readonly target: number;
  readonly eager: boolean;
  index: number;
  digits: number;
  text: string;
  caret: number | undefined;
}

const DIGIT = /^\p{Nd}$/u;
const ASCII_DIGIT = /^[0-9]$/u;
const SEPARATOR = /^[\p{P}\p{Zs}]$/u;

const EARLY: Readonly<Partial<Record<DateMaskField, number>>> = {
  [DateMaskField.Day]: 3,
  [DateMaskField.Month]: 1,
  [DateMaskField.Hour]: 2,
};

const TIME_PARTS: readonly DateMaskPart[] = [
  { kind: DateMaskPartKind.Literal, text: ' ' },
  { kind: DateMaskPartKind.Digits, field: DateMaskField.Hour, length: 2 },
  { kind: DateMaskPartKind.Literal, text: ':' },
  { kind: DateMaskPartKind.Digits, field: DateMaskField.Minute, length: 2 },
];

const masks = new Map<string, readonly DateMaskPart[]>();

const isDigit = (char: string): boolean => DIGIT.test(char);

const digitsIn = (text: string): number =>
  graphemesOf(text).reduce((count, char) => count + Number(isDigit(char)), 0);

const opensEarly = (part: DigitsPart, char: string): boolean => {
  const limit = EARLY[part.field];

  return limit !== undefined && ASCII_DIGIT.test(char) && Number(char) > limit;
};

export const dateMaskOf = (locale: string, time = false): readonly DateMaskPart[] => {
  const key = `${locale}\u0000${time ? 'time' : 'date'}`;
  const known = masks.get(key);

  if (known !== undefined) {
    return known;
  }

  const date = datePatternOf(locale).map((part): DateMaskPart =>
    part.type === DateTimePart.Literal
      ? { kind: DateMaskPartKind.Literal, text: part.text }
      : { kind: DateMaskPartKind.Digits, field: part.type, length: part.length },
  );

  const parts = time ? [...date, ...TIME_PARTS] : date;

  masks.set(key, parts);
  return parts;
};

const placeDigit = (run: MaskRun, char: string): void => {
  run.text += char;
  run.digits += 1;
  if (run.caret !== undefined || run.digits < run.target) {
    return;
  }

  run.caret = run.text.length;
};

const fillDigits = (run: MaskRun, part: DigitsPart): boolean => {
  let count = 0;

  while (run.index < run.chars.length && count < part.length) {
    const char = run.chars[run.index] ?? '';

    run.index += 1;
    if (isDigit(char) && count === 0 && run.eager && opensEarly(part, char)) {
      run.text += '0';
      placeDigit(run, char);
      return true;
    }
    if (isDigit(char)) {
      placeDigit(run, char);
      count += 1;
    } else if (count > 0 && SEPARATOR.test(char)) {
      return part.field !== DateField.Year;
    }
  }
  return count === part.length;
};

const digitAhead = (run: MaskRun): boolean => run.chars.slice(run.index).some(isDigit);

const literalFits = (run: MaskRun, complete: boolean): boolean =>
  complete && (run.eager || digitAhead(run));

const walkParts = (run: MaskRun, parts: readonly DateMaskPart[]): void => {
  let complete = true;

  for (const part of parts) {
    if (part.kind === DateMaskPartKind.Literal && !literalFits(run, complete)) {
      return;
    }
    if (part.kind === DateMaskPartKind.Literal) {
      run.text += part.text;
    } else {
      complete = fillDigits(run, part);
    }
    if (run.index >= run.chars.length && !complete) {
      return;
    }
  }
};

export const maskDateText = (
  raw: string,
  caret: number,
  parts: readonly DateMaskPart[],
  eager = true,
): MaskedDateText => {
  const run: MaskRun = {
    chars: graphemesOf(raw),
    target: digitsIn(raw.slice(0, caret)),
    eager,
    index: 0,
    digits: 0,
    text: '',
    caret: caret === 0 ? 0 : undefined,
  };

  walkParts(run, parts);

  const end = caret >= raw.length || run.caret === undefined;

  return {
    text: run.text,
    caret: end ? run.text.length : Math.min(run.caret ?? 0, run.text.length),
  };
};

const segmentsOf = (text: string, parts: readonly DateMaskPart[]): Segment[] => {
  const segments: Segment[] = [];
  let at = 0;

  parts.forEach((part, index) => {
    if (part.kind === DateMaskPartKind.Literal) {
      at += text.startsWith(part.text, at) ? part.text.length : 0;
      return;
    }
    const start = at;

    while (at < text.length && at - start < part.length && isDigit(text[at] ?? '')) {
      at += 1;
    }
    const after = parts[index + 1];

    segments.push({
      part,
      start,
      end: at,
      next: after?.kind === DateMaskPartKind.Literal ? after.text : undefined,
    });
  });

  return segments;
};

const skipLiteral = (text: string, caret: number, segment: Segment | undefined): number =>
  segment?.next !== undefined && text.startsWith(segment.next, caret)
    ? caret + segment.next.length
    : caret;

const closeSegment = (text: string, segment: Segment): MaskedDateText => {
  const count = segment.end - segment.start;

  const pad =
    segment.part.field === DateField.Year || !ASCII_DIGIT.test(text[segment.start] ?? '')
      ? ''
      : '0'.repeat(segment.part.length - count);

  const padded = `${text.slice(0, segment.start)}${pad}${text.slice(segment.start)}`;
  const end = segment.end + pad.length;
  const literal = segment.next ?? '';

  if (padded.startsWith(literal, end)) {
    return { text: padded, caret: end + literal.length };
  }
  return {
    text: `${padded.slice(0, end)}${literal}${padded.slice(end)}`,
    caret: end + literal.length,
  };
};

const typeSeparator = (
  text: string,
  caret: number,
  parts: readonly DateMaskPart[],
): MaskedDateText => {
  const segment = segmentsOf(text, parts).find(
    (candidate) => candidate.end === caret && candidate.end > candidate.start,
  );

  return segment === undefined ? { text, caret } : closeSegment(text, segment);
};

const isFull = (segment: Segment): boolean => segment.end - segment.start === segment.part.length;

const replaceDigit = (
  text: string,
  at: number,
  digit: string,
  segment: Segment,
): MaskedDateText => {
  if (at === segment.start && segment.part.length === 2 && opensEarly(segment.part, digit)) {
    const next = `${text.slice(0, at)}0${digit}${text.slice(at + 2)}`;

    return { text: next, caret: skipLiteral(next, at + 2, segment) };
  }
  const next = `${text.slice(0, at)}${digit}${text.slice(at + 1)}`;

  return {
    text: next,
    caret: at + 1 === segment.end ? skipLiteral(next, at + 1, segment) : at + 1,
  };
};

const insertDigit = (
  text: string,
  caret: number,
  digit: string,
  parts: readonly DateMaskPart[],
): MaskedDateText => {
  const segments = segmentsOf(text, parts);
  const ending = segments.find((segment) => segment.end === caret && isFull(segment));
  const at = skipLiteral(text, caret, ending);
  const segment = segments.find((candidate) => candidate.start <= at && at < candidate.end);

  if (segment !== undefined && isFull(segment)) {
    return replaceDigit(text, at, digit, segment);
  }
  return maskDateText(`${text.slice(0, at)}${digit}${text.slice(at)}`, at + 1, parts);
};

export const typeIntoDateText = (
  text: string,
  caret: number,
  data: string,
  parts: readonly DateMaskPart[],
): MaskedDateText => {
  const characters = graphemesOf(data);
  const digits = characters.filter(isDigit);

  if (digits.length === 0) {
    return characters.some((char) => SEPARATOR.test(char))
      ? typeSeparator(text, caret, parts)
      : { text, caret };
  }
  return digits.reduce((state, digit) => insertDigit(state.text, state.caret, digit, parts), {
    text,
    caret,
  });
};
