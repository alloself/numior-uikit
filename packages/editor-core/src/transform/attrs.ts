import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import type { Attrs } from '../model/node.types';
import type { AttrSpecs } from '../schema/schema.types';
import type { StepResult } from './step.types';
import { liftInto } from './tree';

export const validAttrs = (specs: AttrSpecs | undefined, attrs: Attrs): boolean =>
  specs !== undefined &&
  Object.keys(attrs).every((key) => Object.hasOwn(specs, key)) &&
  Object.entries(specs).every(([key, spec]) => {
    const value = attrs[key];

    return value !== undefined && (spec.verify === undefined || spec.verify(value));
  });

export const applyAttrs = (doc: Doc, pos: number, attrs: Attrs): StepResult => {
  if (pos < 0 || pos >= doc.size) {
    return { ok: false, reason: 'range' };
  }
  const resolved = doc.resolve(pos);
  const target = resolved.nodeAfter;

  if (target?.kind !== 'element' || resolved.textOffset > 0) {
    return { ok: false, reason: 'target' };
  }
  if (!validAttrs(doc.schema.nodes.get(target.type)?.attrs, attrs)) {
    return { ok: false, reason: 'attrs' };
  }
  const root = liftInto(resolved, resolved.depth + 1, { ...target, attrs });

  return { ok: true, doc: createDoc(doc.schema, root) };
};

export const applyDocAttrs = (doc: Doc, attrs: Attrs): StepResult =>
  validAttrs(doc.schema.top.attrs, attrs)
    ? { ok: true, doc: createDoc(doc.schema, { ...doc.root, attrs }) }
    : { ok: false, reason: 'attrs' };
