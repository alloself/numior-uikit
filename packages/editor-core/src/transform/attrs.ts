import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { ContentNodeKind, type Attrs, type AttrValue, type ElementNode } from '../model/node.types';
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

export const pickedAttrs = (target: ElementNode, patch: Attrs): Attrs =>
  Object.keys(patch).reduce<Record<string, AttrValue>>((picked, key) => {
    const value = target.attrs[key];

    if (value !== undefined) {
      picked[key] = value;
    }
    return picked;
  }, {});

export const changedAttrs = (target: ElementNode, attrs: Attrs): Attrs =>
  Object.entries(attrs).reduce<Record<string, AttrValue>>((changed, [key, value]) => {
    if (target.attrs[key] !== value) {
      changed[key] = value;
    }
    return changed;
  }, {});

export const applyAttrs = (doc: Doc, pos: number, attrs: Attrs): StepResult => {
  if (pos < 0 || pos >= doc.size) {
    return { ok: false, reason: 'range' };
  }
  const resolved = doc.resolve(pos);
  const target = resolved.nodeAfter;

  if (target?.kind !== ContentNodeKind.Element || resolved.textOffset > 0) {
    return { ok: false, reason: 'target' };
  }
  const next = { ...target.attrs, ...attrs };

  if (!validAttrs(doc.schema.nodes.get(target.type)?.attrs, next)) {
    return { ok: false, reason: 'attrs' };
  }
  const root = liftInto(resolved, resolved.depth + 1, { ...target, attrs: next });

  return { ok: true, doc: createDoc(doc.schema, root) };
};

export const applyDocAttrs = (doc: Doc, attrs: Attrs): StepResult =>
  validAttrs(doc.schema.top.attrs, attrs)
    ? { ok: true, doc: createDoc(doc.schema, { ...doc.root, attrs }) }
    : { ok: false, reason: 'attrs' };
