import type { Doc, Slice } from '../doc/doc.types';
import { normalizeContent, sameMarks } from '../model/node';
import { applyAttrs, applyDocAttrs, pickedAttrs } from './attrs';
import { applyMarkup, markupBefore } from './markup';
import { createStepMap, EMPTY_MAP } from './mapping';
import type { Mappable, StepMap } from './mapping.types';
import { applyMark, heldSpans } from './marks';
import { applyMove, createMoveMap, swapOf } from './move';
import { applyPlan, aroundPlan, replacePlan, sliceSize } from './replace';
import { ContentNodeKind, type NodeId } from '../model/node.types';
import { StepKind, type Step, type StepResult, type StepSpan } from './step.types';
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
    case StepKind.Replace: {
      const plan = replacePlan(step.from, step.to, step.slice);

      return plan === undefined ? { ok: false, reason: 'depth' } : applyPlan(doc, plan, fresh);
    }
    case StepKind.ReplaceAround: {
      const plan = aroundPlan(doc, step);

      return plan === undefined ? { ok: false, reason: 'range' } : applyPlan(doc, plan, fresh);
    }
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return applyMark(
        doc,
        step.from,
        step.to,
        step.mark,
        step.kind === StepKind.AddMark,
        step.skip,
      );
    case StepKind.Move:
      return applyMove(doc, step.from, step.to, step.target);
    case StepKind.Attrs:
      return applyAttrs(doc, step.pos, step.attrs);
    case StepKind.Markup:
      return applyMarkup(doc, step.changes);
    case StepKind.DocAttrs:
      return applyDocAttrs(doc, step.attrs);
  }
};

export const stepMapOf = (step: Step): StepMap => {
  switch (step.kind) {
    case StepKind.Replace:
      return createStepMap([
        { start: step.from, oldSize: step.to - step.from, newSize: sliceSize(step.slice) },
      ]);
    case StepKind.ReplaceAround:
      return createStepMap([
        { start: step.from, oldSize: step.gapFrom - step.from, newSize: step.insert },
        {
          start: step.gapTo,
          oldSize: step.to - step.gapTo,
          newSize: sliceSize(step.slice) - step.insert,
        },
      ]);
    case StepKind.Move:
      return createMoveMap(swapOf(step.from, step.to, step.target));
    case StepKind.AddMark:
    case StepKind.RemoveMark:
    case StepKind.Attrs:
    case StepKind.Markup:
    case StepKind.DocAttrs:
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
  const added = step.kind === StepKind.AddMark;
  const skip = heldSpans(doc, step.from, step.to, step.mark, added);

  return {
    kind: added ? 'removeMark' : 'addMark',
    from: step.from,
    to: step.to,
    mark: step.mark,
    ...(skip.length === 0 ? {} : { skip }),
  };
};

const invertMove = (step: Extract<Step, { kind: 'move' }>): Step => {
  const size = step.to - step.from;

  return step.target < step.from
    ? { kind: 'move', from: step.target, to: step.target + size, target: step.to }
    : { kind: 'move', from: step.target - size, to: step.target, target: step.from };
};

export const invertStep = (step: Step, doc: Doc): Step => {
  switch (step.kind) {
    case StepKind.Move:
      return invertMove(step);
    case StepKind.Replace:
      return {
        kind: 'replace',
        from: step.from,
        to: step.from + sliceSize(step.slice),
        slice: doc.slice(step.from, step.to),
      };
    case StepKind.ReplaceAround:
      return invertAround(step, doc);
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return invertMark(step, doc);
    case StepKind.Attrs: {
      const target = doc.nodeAt(step.pos);

      return {
        ...step,
        attrs:
          target?.kind === ContentNodeKind.Element ? pickedAttrs(target, step.attrs) : step.attrs,
      };
    }
    case StepKind.Markup:
      return { kind: 'markup', changes: markupBefore(doc, step.changes) };
    case StepKind.DocAttrs:
      return { ...step, attrs: doc.root.attrs };
  }
};

const mapRangeStep = (
  step: Step & { readonly from: number; readonly to: number },
  mapping: Mappable,
): StepSpan | undefined => {
  if (step.from === step.to) {
    const at = mapping.mapResult(step.from, 1);

    return at.deletedAcross ? undefined : { from: at.pos, to: at.pos };
  }
  const span = mapping.mapSpan(step.from, step.to);

  return span === undefined || (span.from.deletedAcross && span.to.deletedAcross)
    ? undefined
    : { from: span.from.pos, to: Math.max(span.from.pos, span.to.pos) };
};

const mapMove = (step: Extract<Step, { kind: 'move' }>, mapping: Mappable): Step | undefined => {
  const range = mapRangeStep(step, mapping);
  const target = mapping.mapResult(step.target, step.target < step.from ? -1 : 1);

  return range === undefined ||
    range.from >= range.to ||
    target.deletedAcross ||
    (target.pos >= range.from && target.pos <= range.to)
    ? undefined
    : { kind: 'move', from: range.from, to: range.to, target: target.pos };
};

const mapAround = (
  step: Extract<Step, { kind: 'replaceAround' }>,
  mapping: Mappable,
): Step | undefined => {
  const range = mapRangeStep(step, mapping);
  const gap = mapping.mapSpan(step.gapFrom, step.gapTo, true);

  if (range === undefined || gap === undefined) {
    return undefined;
  }
  const gapFrom = step.gapFrom === step.from ? range.from : gap.from.pos;
  const gapTo = step.gapTo === step.to ? range.to : gap.to.pos;

  return range.from > gapFrom || range.to < gapTo
    ? undefined
    : { ...step, ...range, gapFrom, gapTo };
};

const mapMarkStep = (
  step: Extract<Step, { kind: 'addMark' | 'removeMark' }>,
  mapping: Mappable,
): Step | undefined => {
  const range = mapping.mapSpan(step.from, step.to);
  const from = range?.from.pos ?? 0;
  const to = range?.to.pos ?? 0;

  const skip = (step.skip ?? [])
    .flatMap((span) => {
      const held = mapping.mapSpan(span.from, span.to);

      return held !== undefined && held.from.pos < held.to.pos
        ? [{ from: held.from.pos, to: held.to.pos }]
        : [];
    })
    .toSorted((left, right) => left.from - right.from);

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
    case StepKind.Replace: {
      const range = mapRangeStep(step, mapping);

      return range === undefined ? undefined : { ...step, ...range };
    }
    case StepKind.ReplaceAround:
      return mapAround(step, mapping);
    case StepKind.Move:
      return mapMove(step, mapping);
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return mapMarkStep(step, mapping);
    case StepKind.Attrs: {
      const result = mapping.mapResult(step.pos, 1);

      return result.deletedAfter ? undefined : { ...step, pos: result.pos };
    }
    case StepKind.Markup:
      return mapMarkup(step, mapping);
    case StepKind.DocAttrs:
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
  if (first.kind === StepKind.Replace && second.kind === StepKind.Replace) {
    return mergeReplace(first, second);
  }
  if (
    (first.kind === StepKind.AddMark || first.kind === StepKind.RemoveMark) &&
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
