import { RankMessageKind, type RankCaseFirst, type RankSensitivity } from './engine.types';

export interface RankCollation {
  readonly locale: string;
  readonly numeric: boolean;
  readonly sensitivity: RankSensitivity;
  readonly caseFirst: RankCaseFirst;
  readonly ignorePunctuation: boolean;
}

export type RankMessage =
  | { readonly kind: typeof RankMessageKind.Part; readonly id: number; readonly text: string }
  | { readonly kind: typeof RankMessageKind.Drop; readonly id: number }
  | {
      readonly kind: typeof RankMessageKind.Sort;
      readonly id: number;
      readonly lengths: Uint32Array;
      readonly collation: RankCollation;
    };

export interface RankAnswer {
  readonly id: number;
  readonly order: Uint32Array;
}

const SENSITIVITIES: readonly RankSensitivity[] = ['base', 'accent', 'case', 'variant'];
const CASES: readonly RankCaseFirst[] = ['upper', 'lower', 'false'];

const isFields = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const sensitivityOf = (value: unknown): RankSensitivity | undefined =>
  SENSITIVITIES.find((item) => item === value);

const caseFirstOf = (value: unknown): RankCaseFirst | undefined =>
  CASES.find((item) => item === value);

export const collationOf = (collator: Intl.Collator): RankCollation => {
  const options = collator.resolvedOptions();

  return {
    locale: options.locale,
    numeric: options.numeric,
    sensitivity: sensitivityOf(options.sensitivity) ?? 'variant',
    caseFirst: caseFirstOf(options.caseFirst) ?? 'false',
    ignorePunctuation: options.ignorePunctuation,
  };
};

export const collatorOf = (collation: RankCollation): Intl.Collator =>
  new Intl.Collator(collation.locale, {
    numeric: collation.numeric,
    sensitivity: collation.sensitivity,
    caseFirst: collation.caseFirst,
    ignorePunctuation: collation.ignorePunctuation,
  });

const readCollation = (value: unknown): RankCollation | undefined => {
  if (!isFields(value)) {
    return undefined;
  }

  const sensitivity = sensitivityOf(value.sensitivity);
  const caseFirst = caseFirstOf(value.caseFirst);

  return typeof value.locale === 'string' &&
    typeof value.numeric === 'boolean' &&
    typeof value.ignorePunctuation === 'boolean' &&
    sensitivity !== undefined &&
    caseFirst !== undefined
    ? {
        locale: value.locale,
        numeric: value.numeric,
        sensitivity,
        caseFirst,
        ignorePunctuation: value.ignorePunctuation,
      }
    : undefined;
};

export const readRankMessage = (value: unknown): RankMessage | undefined => {
  if (!isFields(value) || typeof value.id !== 'number') {
    return undefined;
  }
  if (value.kind === RankMessageKind.Part) {
    return typeof value.text === 'string'
      ? { kind: 'part', id: value.id, text: value.text }
      : undefined;
  }
  if (value.kind === RankMessageKind.Drop) {
    return { kind: 'drop', id: value.id };
  }

  const collation = readCollation(value.collation);

  return value.kind === RankMessageKind.Sort &&
    value.lengths instanceof Uint32Array &&
    collation !== undefined
    ? { kind: 'sort', id: value.id, lengths: value.lengths, collation }
    : undefined;
};

export const readRankAnswer = (value: unknown): RankAnswer | undefined =>
  isFields(value) && typeof value.id === 'number' && value.order instanceof Uint32Array
    ? { id: value.id, order: value.order }
    : undefined;

export const unpackDictionary = (text: string, lengths: Uint32Array): string[] => {
  const dictionary: string[] = [];
  let offset = 0;

  for (const length of lengths) {
    dictionary.push(text.slice(offset, offset + length));
    offset += length;
  }
  return dictionary;
};

export const collatedOrder = (
  dictionary: readonly string[],
  collator: Intl.Collator,
): Uint32Array => {
  const order = Array.from(dictionary.keys());

  order.sort((a, b) => collator.compare(dictionary[a] ?? '', dictionary[b] ?? ''));
  return Uint32Array.from(order);
};
