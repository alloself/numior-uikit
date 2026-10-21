import type { Doc, Slice } from '../doc/doc.types';
import { idSourceAfter, sameMark, seededOf, withContent } from '../model/node';
import type { ContentNode, ElementNode, Mark, NodeId, TextNode } from '../model/node.types';
import { createMapping } from './mapping';
import type { StepMap } from './mapping.types';
import { applyStep, stepMapOf } from './step';
import type { MarkupChange, Step, StepResult } from './step.types';
import type { NodeMarkup, SplitType, Transform, TransformOptions } from './transform.types';

interface Span {
  readonly from: number;
  readonly to: number;
}

const EMPTY: Slice = { content: [], openStart: 0, openEnd: 0 };

const allows = (doc: Doc, parent: ElementNode, type: string): boolean =>
  doc.schema.nodes.get(parent.type)?.marks.has(type) === true;

const holds = (marks: readonly Mark[], mark: Mark): boolean =>
  marks.some((item) => sameMark(item, mark));

const textSpan = (
  doc: Doc,
  from: number,
  to: number,
  takes: (node: TextNode, parent: ElementNode) => boolean,
): Span | undefined => {
  let first: number | undefined;
  let last = from;

  doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.kind === 'text' && takes(node, parent)) {
      first ??= Math.max(from, pos);
      last = Math.min(to, pos + node.text.length);
    }
    return true;
  });

  return first === undefined ? undefined : { from: first, to: last };
};

const marksWhere = (
  doc: Doc,
  from: number,
  to: number,
  keep: (mark: Mark, parent: ElementNode) => boolean,
): Mark[] => {
  const found: Mark[] = [];

  doc.nodesBetween(from, to, (node, _pos, parent) => {
    if (node.kind === 'text') {
      for (const mark of node.marks) {
        if (keep(mark, parent) && !holds(found, mark)) {
          found.push(mark);
        }
      }
    }
    return true;
  });

  return found;
};

const matches = (mark: Mark, filter: Mark | string | undefined): boolean => {
  if (filter === undefined) {
    return true;
  }
  return typeof filter === 'string' ? mark.type === filter : sameMark(mark, filter);
};

const markupOf = (doc: Doc, change: NodeMarkup): MarkupChange => {
  const target = doc.nodeAt(change.pos);

  if (target?.kind !== 'element') {
    throw new RangeError(`No element starts at position ${change.pos}`);
  }
  if (change.type === undefined || change.type === target.type) {
    return { pos: change.pos, type: target.type, attrs: { ...target.attrs, ...change.attrs } };
  }

  const retyped = doc.schema.element(change.type, { id: target.id, attrs: change.attrs ?? {} });

  return { pos: change.pos, type: retyped.type, attrs: retyped.attrs };
};

export const createTransform = (start: Doc, options: TransformOptions = {}): Transform => {
  const steps: Step[] = [];
  const docs: Doc[] = [];
  const maps: StepMap[] = [];
  const ids = options.ids ?? idSourceAfter(start.root);
  const used = new Set<NodeId>();
  const unplaced = new Set<NodeId>();
  let doc = start;

  const seeded = seededOf(ids);

  const freshId = (): NodeId => {
    for (;;) {
      const id = ids.next();

      if (!used.has(id) && (seeded !== undefined || doc.byId(id) === undefined)) {
        used.add(id);
        if (seeded !== undefined) {
          unplaced.add(id);
        }
        return id;
      }
    }
  };

  const place = (nodes: readonly ContentNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'element') {
        unplaced.delete(node.id);
        seeded?.reserve(node.id);
        place(node.content);
      }
    }
  };

  const freshen = (
    content: readonly ContentNode[],
    keeps: (id: NodeId) => boolean,
  ): ContentNode[] =>
    content.map((node): ContentNode => {
      if (node.kind === 'text') {
        return node;
      }
      const id = keeps(node.id) ? node.id : freshId();

      used.add(id);
      return { ...node, id, content: freshen(node.content, keeps) };
    });

  const maybeStep = (step: Step): StepResult => {
    const result = applyStep(doc, step, unplaced);

    if (result.ok) {
      if (step.kind === 'replace' || step.kind === 'replaceAround') {
        place(step.slice.content);
      }
      steps.push(step);
      docs.push(doc);
      maps.push(stepMapOf(step));
      doc = result.doc;
    }
    return result;
  };

  const markStep = (span: Span | undefined, make: (span: Span) => Step): void => {
    if (span !== undefined) {
      maybeStep(make(span));
    }
  };

  const transform: Transform = {
    get before() {
      return start;
    },
    newId: freshId,
    get doc() {
      return doc;
    },
    get steps() {
      return steps;
    },
    get docs() {
      return docs;
    },
    get mapping() {
      return createMapping(maps);
    },
    get changed() {
      return steps.length > 0;
    },
    step: (step) => {
      const result = maybeStep(step);

      if (!result.ok) {
        throw new RangeError(`The ${step.kind} step cannot apply: ${result.reason}`);
      }
      return transform;
    },
    maybeStep,
    replace: (from, to, slice = EMPTY) => {
      const seen = new Set<NodeId>();

      const keeps = (id: NodeId): boolean => {
        if (unplaced.has(id) && !seen.has(id)) {
          seen.add(id);
          return true;
        }

        const pos = doc.positionOf(id);

        const free =
          !seen.has(id) && id !== doc.root.id && (pos === undefined || (pos >= from && pos < to));

        seen.add(id);
        return free;
      };

      return transform.step({
        kind: 'replace',
        from,
        to,
        slice: { ...slice, content: freshen(slice.content, keeps) },
      });
    },
    insert: (pos, content) => transform.replace(pos, pos, { content, openStart: 0, openEnd: 0 }),
    delete: (from, to) => transform.replace(from, to),
    insertText: (text, from, to = from, marks) => {
      const before = doc.resolve(from).nodeBefore;
      const kept = marks ?? (before?.kind === 'text' ? before.marks : []);

      return text === ''
        ? transform.delete(from, to)
        : transform.replace(from, to, {
            content: [doc.schema.text(text, kept)],
            openStart: 0,
            openEnd: 0,
          });
    },
    addMark: (from, to, mark) => {
      const replaced = marksWhere(
        doc,
        from,
        to,
        (old, parent) =>
          old.type === mark.type && !sameMark(old, mark) && allows(doc, parent, mark.type),
      );

      for (const old of replaced) {
        markStep(
          textSpan(
            doc,
            from,
            to,
            (node, parent) => allows(doc, parent, old.type) && holds(node.marks, old),
          ),
          (span) => ({ kind: 'removeMark', from: span.from, to: span.to, mark: old }),
        );
      }

      markStep(
        textSpan(
          doc,
          from,
          to,
          (node, parent) => allows(doc, parent, mark.type) && !holds(node.marks, mark),
        ),
        (span) => ({ kind: 'addMark', from: span.from, to: span.to, mark }),
      );

      return transform;
    },
    removeMark: (from, to, filter) => {
      for (const mark of marksWhere(doc, from, to, (item) => matches(item, filter))) {
        markStep(
          textSpan(
            doc,
            from,
            to,
            (node, parent) => allows(doc, parent, mark.type) && holds(node.marks, mark),
          ),
          (span) => ({ kind: 'removeMark', from: span.from, to: span.to, mark }),
        );
      }
      return transform;
    },
    setNodeAttrs: (pos, attrs) => {
      const target = doc.nodeAt(pos);

      if (target?.kind !== 'element') {
        throw new RangeError(`No element starts at position ${pos}`);
      }
      return transform.step({ kind: 'attrs', pos, attrs: { ...target.attrs, ...attrs } });
    },
    setNodesMarkup: (changes) => {
      const latest = new Map<number, NodeMarkup>();

      for (const change of changes) {
        const earlier = latest.get(change.pos);

        latest.set(change.pos, {
          pos: change.pos,
          type: change.type ?? earlier?.type,
          attrs: { ...earlier?.attrs, ...change.attrs },
        });
      }

      return latest.size === 0
        ? transform
        : transform.step({
            kind: 'markup',
            changes: [...latest.values()].map((change) => markupOf(doc, change)),
          });
    },
    setDocAttrs: (attrs) =>
      transform.step({ kind: 'docAttrs', attrs: { ...doc.root.attrs, ...attrs } }),
    split: (pos, depth = 1, after?: SplitType) => {
      const resolved = doc.resolve(pos);
      let left: ContentNode[] = [];
      let right: ContentNode[] = [];

      for (let made = 0; made < depth; made += 1) {
        const node = resolved.node(resolved.depth - made);

        const copy: ElementNode =
          made === 0 && after !== undefined
            ? doc.schema.element(after.type, { id: freshId(), attrs: after.attrs })
            : { ...node, id: freshId() };

        left = [withContent(node, left)];
        right = [withContent(copy, right)];
      }
      return transform.step({
        kind: 'replace',
        from: pos,
        to: pos,
        slice: { content: [...left, ...right], openStart: depth, openEnd: depth },
      });
    },
    join: (pos, depth = 1) =>
      transform.step({ kind: 'replace', from: pos - depth, to: pos + depth, slice: EMPTY }),
  };

  return transform;
};
