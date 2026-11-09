import {
  ContentNodeKind,
  StepKind,
  type Attrs,
  type AttrValue,
  type Doc,
  type Step,
} from '@numior/editor-core';
import type { AttrConflict, AttrWrite, UnconfirmedStep } from './collab.types';

const writesAt = (doc: Doc | undefined, pos: number, attrs: Attrs): readonly AttrWrite[] => {
  const node = doc?.nodeAt(pos);

  if (node?.kind !== ContentNodeKind.Element) {
    return [];
  }

  return Object.entries(attrs).reduce<AttrWrite[]>((writes, [attr, value]) => {
    if (node.attrs[attr] !== value) {
      writes.push({ nodeId: node.id, attr, value });
    }
    return writes;
  }, []);
};

const writesOf = (step: Step, doc: Doc | undefined): readonly AttrWrite[] => {
  switch (step.kind) {
    case StepKind.Attrs:
      return writesAt(doc, step.pos, step.attrs);
    case StepKind.Markup:
      return step.changes.flatMap((change) => writesAt(doc, change.pos, change.attrs));
    default:
      return [];
  }
};

const writeKey = (write: AttrWrite): string => `${write.nodeId}\n${write.attr}`;

export const attrConflicts = (
  docs: readonly Doc[],
  remote: readonly Step[],
  local: readonly UnconfirmedStep[],
): readonly AttrConflict[] => {
  const undone = local.length;
  const ours = new Map<string, AttrValue>();
  const theirs = new Map<string, AttrConflict>();

  local.forEach((item, index) => {
    writesOf(item.step, docs[undone - index]).forEach((write) => {
      ours.set(writeKey(write), write.value);
    });
  });

  remote.forEach((step, index) => {
    writesOf(step, docs[undone + index]).forEach((write) => {
      theirs.set(writeKey(write), { ...write, index });
    });
  });

  return Array.from(theirs).reduce<AttrConflict[]>((found, [key, conflict]) => {
    const own = ours.get(key);

    if (own !== undefined && own !== conflict.value) {
      found.push(conflict);
    }
    return found;
  }, []);
};
