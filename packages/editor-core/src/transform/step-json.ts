import {
  isAttrValue,
  isFields,
  markFromJSON,
  markToJSON,
  sliceFromJSON,
  sliceToJSON,
} from '../doc/json';
import type { MarkJSON, SliceJSON } from '../doc/json.types';
import type { Attrs } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { StepKind, type MarkupChange, type Step, type StepSpan } from './step.types';

type Fields = Readonly<Record<string, unknown>>;

type MarkStepKind = typeof StepKind.AddMark | typeof StepKind.RemoveMark;

export type StepJSON =
  | {
      readonly kind: typeof StepKind.Replace;
      readonly from: number;
      readonly to: number;
      readonly slice: SliceJSON;
    }
  | {
      readonly kind: typeof StepKind.ReplaceAround;
      readonly from: number;
      readonly to: number;
      readonly gapFrom: number;
      readonly gapTo: number;
      readonly slice: SliceJSON;
      readonly insert: number;
    }
  | {
      readonly kind: MarkStepKind;
      readonly from: number;
      readonly to: number;
      readonly mark: MarkJSON;
      readonly skip?: readonly StepSpan[] | undefined;
    }
  | { readonly kind: typeof StepKind.Attrs; readonly pos: number; readonly attrs: Attrs }
  | { readonly kind: typeof StepKind.Markup; readonly changes: readonly MarkupChange[] }
  | { readonly kind: typeof StepKind.DocAttrs; readonly attrs: Attrs };

export const stepToJSON = (step: Step): StepJSON => {
  switch (step.kind) {
    case StepKind.Replace:
    case StepKind.ReplaceAround:
      return { ...step, slice: sliceToJSON(step.slice) };
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return { ...step, mark: markToJSON(step.mark) };
    default:
      return step;
  }
};

const isPosition = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isAttrs = (value: unknown): value is Attrs =>
  isFields(value) && Object.values(value).every(isAttrValue);

const isSpan = (value: unknown): value is StepSpan =>
  isFields(value) && isPosition(value.from) && isPosition(value.to);

const isSkip = (value: unknown): value is readonly StepSpan[] | undefined =>
  value === undefined || (Array.isArray(value) && value.every(isSpan));

const isMarkupChange = (value: unknown): value is MarkupChange =>
  isFields(value) &&
  isPosition(value.pos) &&
  typeof value.type === 'string' &&
  isAttrs(value.attrs);

const readReplace = (schema: Schema, value: Fields): Step | undefined => {
  const slice = sliceFromJSON(schema, value.slice);

  return slice === undefined || !isPosition(value.from) || !isPosition(value.to)
    ? undefined
    : { kind: StepKind.Replace, from: value.from, to: value.to, slice };
};

const readAround = (schema: Schema, value: Fields): Step | undefined => {
  if (
    !isPosition(value.from) ||
    !isPosition(value.to) ||
    !isPosition(value.gapFrom) ||
    !isPosition(value.gapTo) ||
    !isPosition(value.insert)
  ) {
    return undefined;
  }

  const slice = sliceFromJSON(schema, value.slice, value.insert);

  if (slice === undefined) {
    return undefined;
  }

  return {
    kind: StepKind.ReplaceAround,
    from: value.from,
    to: value.to,
    gapFrom: value.gapFrom,
    gapTo: value.gapTo,
    slice,
    insert: value.insert,
  };
};

const readMarkStep = (schema: Schema, value: Fields, kind: MarkStepKind): Step | undefined => {
  const mark = markFromJSON(schema, value.mark);

  return mark === undefined ||
    !isPosition(value.from) ||
    !isPosition(value.to) ||
    !isSkip(value.skip)
    ? undefined
    : { kind, from: value.from, to: value.to, mark, skip: value.skip };
};

const readAttrs = (value: Fields): Step | undefined =>
  isPosition(value.pos) && isAttrs(value.attrs)
    ? { kind: StepKind.Attrs, pos: value.pos, attrs: value.attrs }
    : undefined;

const readMarkup = (value: Fields): Step | undefined => {
  const changes = value.changes;

  return Array.isArray(changes) && changes.every(isMarkupChange)
    ? { kind: StepKind.Markup, changes }
    : undefined;
};

const readDocAttrs = (value: Fields): Step | undefined =>
  isAttrs(value.attrs) ? { kind: StepKind.DocAttrs, attrs: value.attrs } : undefined;

export const stepFromJSON = (schema: Schema, value: unknown): Step | undefined => {
  if (!isFields(value)) {
    return undefined;
  }
  switch (value.kind) {
    case StepKind.Replace:
      return readReplace(schema, value);
    case StepKind.ReplaceAround:
      return readAround(schema, value);
    case StepKind.AddMark:
      return readMarkStep(schema, value, StepKind.AddMark);
    case StepKind.RemoveMark:
      return readMarkStep(schema, value, StepKind.RemoveMark);
    case StepKind.Attrs:
      return readAttrs(value);
    case StepKind.Markup:
      return readMarkup(value);
    case StepKind.DocAttrs:
      return readDocAttrs(value);
    default:
      return undefined;
  }
};
