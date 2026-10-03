import type { Doc, Slice } from '../doc/doc.types';
import { createIdSource, sameMarks, withContent } from '../model/node';
import type { ContentNode, ElementNode, Mark, NodeId } from '../model/node.types';
import { createMapping } from './mapping';
import type { StepMap } from './mapping.types';
import { applyStep, stepMapOf } from './step';
import type { Step, StepResult } from './step.types';
import type { SplitType, Transform, TransformOptions } from './transform.types';

interface Portion {
  readonly from: number;
  readonly to: number;
  readonly marks: readonly Mark[];
}

const EMPTY: Slice = { content: [], openStart: 0, openEnd: 0 };

const portionsOf = (doc: Doc, from: number, to: number, type: string): Portion[] => {
  const portions: Portion[] = [];

  doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.kind === 'text' && doc.schema.nodes.get(parent.type)?.marks.has(type) === true) {
      portions.push({
        from: Math.max(from, pos),
        to: Math.min(to, pos + node.text.length),
        marks: node.marks,
      });
    }
    return true;
  });

  return portions;
};

const mergeRuns = (runs: readonly Portion[]): Portion[] =>
  runs.reduce<Portion[]>((merged, run) => {
    const last = merged.at(-1);

    if (last !== undefined && last.to === run.from && sameMarks(last.marks, run.marks)) {
      merged[merged.length - 1] = { ...last, to: run.to };
    } else {
      merged.push(run);
    }
    return merged;
  }, []);

const matches = (mark: Mark, filter: Mark | string | undefined): boolean => {
  if (filter === undefined) {
    return true;
  }
  return typeof filter === 'string' ? mark.type === filter : sameMarks([mark], [filter]);
};

export const createTransform = (start: Doc, options: TransformOptions = {}): Transform => {
  const steps: Step[] = [];
  const docs: Doc[] = [];
  const maps: StepMap[] = [];
  const ids = options.ids ?? createIdSource('n');
  const used = new Set<NodeId>();
  let doc = start;

  const freshId = (): NodeId => {
    for (;;) {
      const id = ids.next();

      if (!used.has(id) && doc.byId(id) === undefined) {
        used.add(id);
        return id;
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
    const result = applyStep(doc, step);

    if (result.ok) {
      steps.push(step);
      docs.push(doc);
      maps.push(stepMapOf(step));
      doc = result.doc;
    }
    return result;
  };

  const markSteps = (
    portions: readonly Portion[],
    make: (run: Portion) => Step | undefined,
  ): void => {
    for (const run of mergeRuns(portions)) {
      const step = make(run);

      if (step !== undefined) {
        maybeStep(step);
      }
    }
  };

  const transform: Transform = {
    get before() {
      return start;
    },
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
      const portions = portionsOf(doc, from, to, mark.type);

      for (const old of new Set(portions.flatMap((portion) => portion.marks))) {
        if (old.type === mark.type && !sameMarks([old], [mark])) {
          markSteps(
            portions
              .filter((portion) => portion.marks.includes(old))
              .map((portion) => ({ ...portion, marks: [old] })),
            (run) => ({ kind: 'removeMark', from: run.from, to: run.to, mark: old }),
          );
        }
      }

      markSteps(
        portionsOf(doc, from, to, mark.type)
          .filter((portion) => !portion.marks.some((item) => sameMarks([item], [mark])))
          .map((portion) => ({ ...portion, marks: [] })),
        (run) => ({ kind: 'addMark', from: run.from, to: run.to, mark }),
      );

      return transform;
    },
    removeMark: (from, to, filter) => {
      const portions =
        doc.schema.marks.size === 0
          ? []
          : [...doc.schema.marks.keys()].flatMap((type) => portionsOf(doc, from, to, type));

      const found = new Map<string, Mark>();

      for (const portion of portions) {
        for (const mark of portion.marks.filter((item) => matches(item, filter))) {
          found.set(JSON.stringify(mark), mark);
        }
      }
      for (const mark of found.values()) {
        markSteps(
          portionsOf(doc, from, to, mark.type)
            .filter((portion) => portion.marks.some((item) => sameMarks([item], [mark])))
            .map((portion) => ({ ...portion, marks: [] })),
          (run) => ({ kind: 'removeMark', from: run.from, to: run.to, mark }),
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
