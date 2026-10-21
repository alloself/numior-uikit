import type { Doc, Slice } from '../doc/doc.types';
import { normalizeContent, sameMarks } from '../model/node';
import { applyAttrs, applyDocAttrs } from './attrs';
import { applyMarkup, markupBefore } from './markup';
import { createStepMap, EMPTY_MAP } from './mapping';
import type { Mappable, StepMap } from './mapping.types';
import { applyMark, heldSpans } from './marks';
import { applyPlan, aroundPlan, replacePlan, sliceSize } from './replace';
import type { NodeId } from '../model/node.types';
import type { Step, StepResult } from './step.types';
import { cutTokens, rebuild, sliceFrame } from './tokens';

const NO_IDS: ReadonlySet<NodeId> = new Set();

const flat = (slice: Slice): boolean => slice.openStart === 0 && slice.openEnd === 0;

const removeBetween = (slice: Slice, from: number, to: number): Slice => {
  const frame = sliceFrame(slice.content, slice.openStart, slice.openEnd, [from, to]);
  const [left, rest] = cutTokens(frame?.inner ?? [], from);
  const [, right] = cutTokens(rest, to - from);

  const built =
    frame === undefined ? undefined : rebuild([...frame.head, ...left, ...right, ...frame.tail]);

  if (built === undefined) {
    throw new RangeError(`The slice cannot lose the range ${from}..${to}`);
  }
  return { content: built.content, openStart: slice.openStart, openEnd: slice.openEnd };
};

export const applyStep = (
  doc: Doc,
  step: Step,
  fresh: ReadonlySet<NodeId> = NO_IDS,
): StepResult => {
  switch (step.kind) {
    case 'replace': {
      const plan = replacePlan(step.from, step.to, step.slice);

      return plan === undefined ? { ok: false, reason: 'depth' } : applyPlan(doc, plan, fresh);
    }
    case 'replaceAround': {
      const plan = aroundPlan(doc, step);

      return plan === undefined ? { ok: false, reason: 'range' } : applyPlan(doc, plan, fresh);
    }
    case 'addMark':
    case 'removeMark':
      return applyMark(doc, step.from, step.to, step.mark, step.kind === 'addMark', step.skip);
    case 'attrs':
      return applyAttrs(doc, step.pos, step.attrs);
    case 'markup':
      return applyMarkup(doc, step.changes);
    case 'docAttrs':
      return applyDocAttrs(doc, step.attrs);
  }
};

export const stepMapOf = (step: Step): StepMap => {
  switch (step.kind) {
    case 'replace':
      return createStepMap([
        { start: step.from, oldSize: step.to - step.from, newSize: sliceSize(step.slice) },
      ]);
    case 'replaceAround':
      return createStepMap([
        { start: step.from, oldSize: step.gapFrom - step.from, newSize: step.insert },
        {
          start: step.gapTo,
          oldSize: step.to - step.gapTo,
          newSize: sliceSize(step.slice) - step.insert,
        },
      ]);
    case 'addMark':
    case 'removeMark':
    case 'attrs':
    case 'markup':
    case 'docAttrs':
      return EMPTY_MAP;
  }
};

const invertAround = (step: Extract<Step, { kind: 'replaceAround' }>, doc: Doc): Step => {
  const gap = step.gapTo - step.gapFrom;
  const inserted = sliceSize(step.slice);

  return {
    kind: 'replaceAround',
    from: step.from,
    to: step.from + inserted + gap,
    gapFrom: step.from + step.insert,
    gapTo: step.from + step.insert + gap,
    slice: removeBetween(
      doc.slice(step.from, step.to),
      step.gapFrom - step.from,
      step.gapTo - step.from,
    ),
    insert: step.gapFrom - step.from,
  };
};

const invertMark = (step: Extract<Step, { kind: 'addMark' | 'removeMark' }>, doc: Doc): Step => {
  const added = step.kind === 'addMark';
  const skip = heldSpans(doc, step.from, step.to, step.mark, added);

  return {
    kind: added ? 'removeMark' : 'addMark',
    from: step.from,
    to: step.to,
    mark: step.mark,
    ...(skip.length === 0 ? {} : { skip }),
  };
};

export const invertStep = (step: Step, doc: Doc): Step => {
  switch (step.kind) {
    case 'replace':
      return {
        kind: 'replace',
        from: step.from,
        to: step.from + sliceSize(step.slice),
        slice: doc.slice(step.from, step.to),
      };
    case 'replaceAround':
      return invertAround(step, doc);
    case 'addMark':
    case 'removeMark':
      return invertMark(step, doc);
    case 'attrs': {
      const target = doc.nodeAt(step.pos);

      return { ...step, attrs: target?.kind === 'element' ? target.attrs : step.attrs };
    }
    case 'markup':
      return { kind: 'markup', changes: markupBefore(doc, step.changes) };
    case 'docAttrs':
      return { ...step, attrs: doc.root.attrs };
  }
};

const mapRangeStep = (
  step: Step & { readonly from: number; readonly to: number },
  mapping: Mappable,
) => {
  const from = mapping.mapResult(step.from, 1);
  const to = mapping.mapResult(step.to, -1);

  return from.deletedAcross && to.deletedAcross
    ? undefined
    : { from: from.pos, to: Math.max(from.pos, to.pos) };
};

const mapAround = (
  step: Extract<Step, { kind: 'replaceAround' }>,
  mapping: Mappable,
): Step | undefined => {
  const range = mapRangeStep(step, mapping);

  if (range === undefined) {
    return undefined;
  }
  const gapFrom = step.gapFrom === step.from ? range.from : mapping.map(step.gapFrom, -1);
  const gapTo = step.gapTo === step.to ? range.to : mapping.map(step.gapTo, 1);

  return range.from > gapFrom || range.to < gapTo
    ? undefined
    : { ...step, ...range, gapFrom, gapTo };
};

const mapMarkStep = (
  step: Extract<Step, { kind: 'addMark' | 'removeMark' }>,
  mapping: Mappable,
): Step | undefined => {
  const from = mapping.map(step.from, 1);
  const to = mapping.map(step.to, -1);

  const skip = (step.skip ?? []).flatMap((span) => {
    const start = mapping.map(span.from, 1);
    const end = mapping.map(span.to, -1);

    return start < end ? [{ from: start, to: end }] : [];
  });

  if (from >= to) {
    return undefined;
  }
  return skip.length === 0 ? { ...step, from, to, skip: undefined } : { ...step, from, to, skip };
};

const mapMarkup = (
  step: Extract<Step, { kind: 'markup' }>,
  mapping: Mappable,
): Step | undefined => {
  const changes = step.changes.flatMap((change) => {
    const result = mapping.mapResult(change.pos, 1);

    return result.deletedAfter ? [] : [{ ...change, pos: result.pos }];
  });

  return changes.length === 0 ? undefined : { kind: 'markup', changes };
};

export const mapStep = (step: Step, mapping: Mappable): Step | undefined => {
  switch (step.kind) {
    case 'replace': {
      const range = mapRangeStep(step, mapping);

      return range === undefined ? undefined : { ...step, ...range };
    }
    case 'replaceAround':
      return mapAround(step, mapping);
    case 'addMark':
    case 'removeMark':
      return mapMarkStep(step, mapping);
    case 'attrs': {
      const result = mapping.mapResult(step.pos, 1);

      return result.deletedAfter ? undefined : { ...step, pos: result.pos };
    }
    case 'markup':
      return mapMarkup(step, mapping);
    case 'docAttrs':
      return step;
  }
};

const mergeReplace = (
  first: Extract<Step, { kind: 'replace' }>,
  second: Extract<Step, { kind: 'replace' }>,
): Step | undefined => {
  if (!flat(first.slice) || !flat(second.slice)) {
    return undefined;
  }
  if (second.from === second.to && second.from === first.from + sliceSize(first.slice)) {
    return {
      ...first,
      slice: {
        content: normalizeContent([...first.slice.content, ...second.slice.content]),
        openStart: 0,
        openEnd: 0,
      },
    };
  }
  const emptied = first.slice.content.length === 0 && second.slice.content.length === 0;

  if (emptied && second.to === first.from) {
    return { ...first, from: second.from };
  }
  return emptied && second.from === first.from
    ? { ...first, to: first.to + second.to - second.from }
    : undefined;
};

export const mergeSteps = (first: Step, second: Step): Step | undefined => {
  if (first.kind === 'replace' && second.kind === 'replace') {
    return mergeReplace(first, second);
  }
  if (
    (first.kind === 'addMark' || first.kind === 'removeMark') &&
    second.kind === first.kind &&
    sameMarks([first.mark], [second.mark]) &&
    (first.skip ?? []).length === 0 &&
    (second.skip ?? []).length === 0 &&
    first.to >= second.from &&
    second.to >= first.from
  ) {
    return { ...first, from: Math.min(first.from, second.from), to: Math.max(first.to, second.to) };
  }
  return undefined;
};
