import type { Doc, Slice } from '../doc/doc.types';
import { ContentNodeKind, type ContentNode, type NodeId } from '../model/node.types';
import type { Mappable } from '../transform/mapping.types';
import { StepKind, type Step } from '../transform/step.types';

type RangeStep = Extract<Step, { readonly from: number; readonly to: number }>;

export type RemovedNodes = Map<NodeId, ContentNode>;

const holdsText = (doc: Doc, type: string): boolean =>
  doc.schema.nodes.get(type)?.inlineContent === true;

const retargetedRange = (
  step: RangeStep,
  mapper: Mappable,
  written: Doc,
  current: Doc,
): Step | undefined => {
  const from = written.resolve(step.from);
  const to = written.resolve(step.to);
  const { id, type } = from.parent;
  const mapped = mapper.mapResult(step.from, 1);
  const removed = mapped.deletedBefore || mapped.deletedAfter;

  if (!removed || to.parent.id !== id || !holdsText(written, type) || mapped.pos > current.size) {
    return undefined;
  }

  const node = current.byId(id);
  const start = current.positionOf(id);

  if (node === undefined || start === undefined || current.resolve(mapped.pos).parent.id === id) {
    return undefined;
  }

  const limit = node.size - 2;

  return {
    ...step,
    from: start + 1 + Math.min(from.parentOffset, limit),
    to: start + 1 + Math.min(to.parentOffset, limit),
  };
};

const followedNode = (
  pos: number,
  mapper: Mappable,
  written: Doc,
  current: Doc,
): number | undefined => {
  if (!mapper.mapResult(pos, 1).deletedAfter) {
    return undefined;
  }

  const node = written.nodeAt(pos);

  return node?.kind === ContentNodeKind.Element ? current.positionOf(node.id) : undefined;
};

const retargetedMarkup = (
  step: Extract<Step, { readonly kind: 'markup' }>,
  mapper: Mappable,
  written: Doc,
  current: Doc,
): Step | undefined => {
  const followed = step.changes.map((change) => followedNode(change.pos, mapper, written, current));

  if (followed.every((pos) => pos === undefined)) {
    return undefined;
  }

  return {
    kind: 'markup',
    changes: step.changes.reduce<(typeof step.changes)[number][]>((kept, change, index) => {
      const pos = followed[index];

      if (pos !== undefined) {
        kept.push({ ...change, pos });
      } else if (!mapper.mapResult(change.pos, 1).deletedAfter) {
        kept.push({ ...change, pos: mapper.map(change.pos, 1) });
      }
      return kept;
    }, []),
  };
};

export const retargeted = (
  step: Step,
  mapper: Mappable,
  written: Doc,
  current: Doc,
): Step | undefined => {
  switch (step.kind) {
    case StepKind.Replace:
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return retargetedRange(step, mapper, written, current);
    case StepKind.Attrs: {
      const pos = followedNode(step.pos, mapper, written, current);

      return pos === undefined ? undefined : { ...step, pos };
    }
    case StepKind.Markup:
      return retargetedMarkup(step, mapper, written, current);
    default:
      return undefined;
  }
};

export const noteRemoved = (step: Step, doc: Doc, removed: RemovedNodes): void => {
  if (step.kind === StepKind.Replace && step.from < step.to) {
    doc.nodesBetween(step.from, step.to, (node, pos) => {
      if (node.kind === ContentNodeKind.Element && pos >= step.from && pos + node.size <= step.to) {
        removed.set(node.id, node);
      }
      return true;
    });
  }
};

const sameNode = (left: ContentNode, right: ContentNode): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

const latest = (doc: Doc, written: Doc, node: ContentNode, removed: RemovedNodes): ContentNode => {
  if (node.kind !== ContentNodeKind.Element) {
    return node;
  }

  const known = removed.get(node.id);
  const before = written.byId(node.id);

  if (
    known?.kind === ContentNodeKind.Element &&
    known.type === node.type &&
    (before === undefined || sameNode(before, node))
  ) {
    return known;
  }

  const content = node.content.map((child) => latest(doc, written, child, removed));

  return content.every((child, index) => child === node.content[index])
    ? node
    : doc.schema.element(node.type, { id: node.id, attrs: node.attrs, content });
};

const latestSlice = (doc: Doc, written: Doc, slice: Slice, removed: RemovedNodes): Slice => ({
  ...slice,
  content: slice.content.map((node) => latest(doc, written, node, removed)),
});

export const withLatestNodes = (step: Step, doc: Doc, written: Doc, removed: RemovedNodes): Step =>
  step.kind === StepKind.Replace && removed.size > 0 && step.slice.openStart === 0
    ? { ...step, slice: latestSlice(doc, written, step.slice, removed) }
    : step;
